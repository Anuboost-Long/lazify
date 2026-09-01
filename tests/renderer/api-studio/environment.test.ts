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

import {
	readApiEnvironments,
	readProjectRoutes,
	renderPage,
	route,
	saveApiEnvironments,
	scanResult,
	sendApiRequest,
} from "./harness";

const SECURED = route({
	security: [
		{ kind: "bearer", schemeName: "bearerAuth", location: "header", parameterName: "Authorization" },
	],
});

async function openEnvironment() {
	await userEvent.click(await screen.findByText("/users/{id}"));
	await userEvent.click(screen.getByRole("button", { name: /api_studio\.environment$/i }));

	return screen.getByLabelText(/api_studio\.environment_name/i).closest("header")!.parentElement!;
}

function savedSet() {
	const calls = saveApiEnvironments.mock.calls;

	return calls[calls.length - 1]?.[1];
}

describe("naming what an environment holds", () => {
	it("calls a variable whatever the user calls it, keeping what it binds to", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		const modal = await openEnvironment();

		await userEvent.click(within(modal).getByRole("button", { name: "baseUrl" }));

		const field = screen.getByLabelText(/api_studio\.variable_name/i);

		await userEvent.clear(field);
		await userEvent.type(field, "apiRoot{Enter}");

		await waitFor(() =>
			expect(savedSet()).toEqual(expect.objectContaining({ names: { baseUrl: "apiRoot" } })),
		);
		expect(within(modal).getByRole("button", { name: "apiRoot" })).toBeTruthy();
	});

	it("renames the label without moving the value off the key it binds to", async () => {
		readApiEnvironments.mockResolvedValue({
			activeId: "local",
			names: {},
			variables: [],
			environments: [{ id: "local", name: "Local", values: { baseUrl: "http://localhost:5000" } }],
		});
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		const modal = await openEnvironment();

		await userEvent.click(within(modal).getByRole("button", { name: "baseUrl" }));

		const field = screen.getByLabelText(/api_studio\.variable_name/i);

		await userEvent.clear(field);
		await userEvent.type(field, "apiRoot{Enter}");

		await waitFor(() => expect(savedSet().names).toEqual({ baseUrl: "apiRoot" }));
		expect(savedSet().environments[0].values).toEqual({ baseUrl: "http://localhost:5000" });
	});

	it("still sends the request the renamed variable stands for", async () => {
		readApiEnvironments.mockResolvedValue({
			activeId: "local",
			names: { baseUrl: "apiRoot" },
			variables: [],
			environments: [{ id: "local", name: "Local", values: { apiRoot: "http://localhost:5000" } }],
		});
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.type(screen.getByLabelText(/^id/), "42");
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() =>
			expect(sendApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: "http://localhost:5000/users/42" }),
			),
		);
	});

	it("will not take a name another variable already answers to", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [SECURED] }));
		renderPage();

		const modal = await openEnvironment();

		await userEvent.click(within(modal).getByRole("button", { name: "Authorization" }));

		const field = screen.getByLabelText(/api_studio\.variable_name/i);

		await userEvent.clear(field);
		await userEvent.type(field, "baseUrl{Enter}");

		expect(within(modal).getByRole("button", { name: "Authorization" })).toBeTruthy();
		expect(savedSet()).toBeUndefined();
	});

	it("declares a variable from the button under the rows, and names it in place", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		const modal = await openEnvironment();

		await userEvent.click(within(modal).getByRole("button", { name: /api_studio\.new_variable$/i }));

		const field = within(modal).getByLabelText(/api_studio\.variable_name/i);

		await userEvent.clear(field);
		await userEvent.type(field, "clientKey{Enter}");

		await waitFor(() =>
			expect(savedSet().variables).toEqual([
				expect.objectContaining({ name: "clientKey", secret: false }),
			]),
		);
		expect(within(modal).getByRole("button", { name: "clientKey" })).toBeTruthy();
	});

	it("duplicates a row with its value, ready to be renamed", async () => {
		readApiEnvironments.mockResolvedValue({
			activeId: "local",
			names: {},
			variables: [{ key: "custom-1", name: "clientKey", secret: false }],
			environments: [{ id: "local", name: "Local", values: { "custom-1": "k-1" } }],
		});
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		const modal = await openEnvironment();

		await userEvent.click(
			within(modal).getByRole("button", { name: /api_studio\.variable_options clientKey/i }),
		);
		await userEvent.click(
			await screen.findByRole("menuitem", { name: /api_studio\.duplicate_variable/i }),
		);

		await waitFor(() =>
			expect(savedSet().variables).toEqual([
				expect.objectContaining({ name: "clientKey" }),
				expect.objectContaining({ name: "clientKey2" }),
			]),
		);
		expect(savedSet().environments[0].values).toEqual({ "custom-1": "k-1", "custom-2": "k-1" });
	});

	it("turns a value into a secret from the row's own menu", async () => {
		readApiEnvironments.mockResolvedValue({
			activeId: "local",
			names: {},
			variables: [{ key: "custom-1", name: "clientKey", secret: false }],
			environments: [{ id: "local", name: "Local", values: { clientKey: "k-1" } }],
		});
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		const modal = await openEnvironment();

		expect(within(modal).getByLabelText("clientKey")).toHaveProperty("type", "text");

		await userEvent.click(
			within(modal).getByRole("button", { name: /api_studio\.variable_options clientKey/i }),
		);
		await userEvent.click(await screen.findByRole("menuitem", { name: /api_studio\.keep_secret/i }));

		await waitFor(() =>
			expect(savedSet().variables).toEqual([expect.objectContaining({ secret: true })]),
		);
	});

	it("keeps a secret hidden until it is asked for", async () => {
		readApiEnvironments.mockResolvedValue({
			activeId: "local",
			names: {},
			variables: [],
			environments: [{ id: "local", name: "Local", values: { authorization: "s3cret" } }],
		});
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [SECURED] }));
		renderPage();
		await openEnvironment();

		const secret = screen.getByDisplayValue("s3cret");

		expect(secret).toHaveProperty("type", "password");

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.show_value/i }));

		expect(secret).toHaveProperty("type", "text");

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.hide_value/i }));

		expect(secret).toHaveProperty("type", "password");
	});
});
