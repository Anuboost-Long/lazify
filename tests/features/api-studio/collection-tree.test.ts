// @vitest-environment jsdom

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async (importOriginal) => ({
	...(await importOriginal<typeof import("react-i18next")>()),
	useTranslation: () => ({
		t: (key: string) => key,
		i18n: { resolvedLanguage: "en", language: "en" },
	}),
}));

import { readRouteDetails, readProjectRoutes, renderPage, scanResult } from "./harness";
import {
	openCustom,
	pickFirstRoute,
	pickMenuItem,
	rowMenu,
	rowOptions,
	savedCollections,
	withCollection,
} from "./collection-harness";

describe("a collection of the user's own", () => {
	it("starts on what the project discovered", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await screen.findByText("/users/{id}");

		expect(
			screen.getByRole("button", { name: /api_studio\.from_project/i }).getAttribute("aria-pressed"),
		).toBe("true");
	});

	it("offers an empty collection to start one from", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();
		await openCustom();

		expect(screen.getByText(/api_studio\.no_custom_collection$/i)).toBeTruthy();
		expect(screen.queryByText("/users/{id}")).toBeNull();
	});

	it("makes a collection, renames it, and takes it away again", async () => {
		await withCollection();

		expect(screen.getByText("api_studio.new_collection_name")).toBeTruthy();

		await rowMenu("api_studio.new_collection_name");
		await pickMenuItem(/api_studio\.rename_collection/i);

		const field = screen.getByLabelText(/api_studio\.collection_name/i);

		await userEvent.clear(field);
		await userEvent.type(field, "Public API{Enter}");

		expect(screen.getByText("Public API")).toBeTruthy();
		await waitFor(() =>
			expect(savedCollections()).toEqual([expect.objectContaining({ name: "Public API" })]),
		);

		await rowMenu("Public API");
		await pickMenuItem(/api_studio\.remove_collection/i);

		expect(screen.getByText(/api_studio\.no_custom_collection$/i)).toBeTruthy();
	});

	it("keeps requests in the collection itself", async () => {
		await withCollection();

		await rowMenu("api_studio.new_collection_name");
		await pickMenuItem(/api_studio\.pick_requests/i);
		await pickFirstRoute();

		const collection = screen
			.getByRole("button", { name: rowOptions("api_studio.new_collection_name") })
			.closest("li")!;

		expect(within(collection).getByText("Fetch a user")).toBeTruthy();
		await waitFor(() =>
			expect(savedCollections()).toEqual([
				expect.objectContaining({
					folders: [],
					requests: [expect.objectContaining({ routeId: "route_1", draft: null })],
				}),
			]),
		);
	});

	it("keeps requests in a folder of the collection", async () => {
		await withCollection();

		await rowMenu("api_studio.new_collection_name");
		await pickMenuItem(/api_studio\.new_folder/i);

		expect(screen.getByText(/api_studio\.empty_folder/i)).toBeTruthy();

		const folderRow = screen
			.getByRole("button", { name: rowOptions("api_studio.new_folder_name") })
			.closest("li")!;

		await rowMenu("api_studio.new_folder_name");
		await pickMenuItem(/api_studio\.pick_requests/i);
		await pickFirstRoute();

		expect(within(folderRow).getByText("Fetch a user")).toBeTruthy();
		await waitFor(() =>
			expect(savedCollections()).toEqual([
				expect.objectContaining({
					requests: [],
					folders: [
						expect.objectContaining({ requests: [expect.objectContaining({ routeId: "route_1" })] }),
					],
				}),
			]),
		);

		await rowMenu("Fetch a user");
		await pickMenuItem(/api_studio\.remove_request/i);

		expect(screen.getByText(/api_studio\.empty_folder/i)).toBeTruthy();
	});

	it("keeps the route's own definition with the request", async () => {
		readRouteDetails.mockResolvedValue([
			{
				id: "route_1",
				description: "The one user",
				parameters: [{ name: "id", location: "path", required: true }],
				requestBody: null,
				responses: [],
			},
		]);
		await withCollection();

		await rowMenu("api_studio.new_collection_name");
		await pickMenuItem(/api_studio\.pick_requests/i);
		await pickFirstRoute();

		await waitFor(() =>
			expect(savedCollections()[0].requests[0].route).toEqual(
				expect.objectContaining({
					path: "/users/{id}",
					description: "The one user",
					parameters: [expect.objectContaining({ name: "id" })],
				}),
			),
		);
	});

	it("will not offer a route the target already holds", async () => {
		await withCollection();

		await rowMenu("api_studio.new_collection_name");
		await pickMenuItem(/api_studio\.pick_requests/i);
		await pickFirstRoute();
		await rowMenu("api_studio.new_collection_name");
		await pickMenuItem(/api_studio\.pick_requests/i);

		const offered = screen.getByRole("checkbox", { name: /\/users\/\{id\}/ });

		expect(offered).toHaveProperty("disabled", true);
		expect(offered).toHaveProperty("checked", true);
	});

	it("renames a request in the collection", async () => {
		await withCollection();

		await rowMenu("api_studio.new_collection_name");
		await pickMenuItem(/api_studio\.pick_requests/i);
		await pickFirstRoute();
		await rowMenu("Fetch a user");
		await pickMenuItem(/api_studio\.rename_request/i);

		const field = screen.getByLabelText(/api_studio\.request_name/i);

		await userEvent.clear(field);
		await userEvent.type(field, "Read one user{Enter}");

		expect(screen.getByText("Read one user")).toBeTruthy();
		await waitFor(() =>
			expect(savedCollections()[0].requests[0]).toEqual(
				expect.objectContaining({ name: "Read one user" }),
			),
		);
	});
});
