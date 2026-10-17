// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
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
	PROJECT,
	SCHEMA_BODY,
	allowApiHost,
	postRoute,
	readApiEnvironments,
	readAllowedHosts,
	readApiRequests,
	readProjectRoutes,
	renderPage,
	responseBody,
	route,
	saveApiEnvironments,
	saveApiRequest,
	scanProjectRoutes,
	scanResult,
	sendApiRequest,
	setApiRequestStorage,
} from "./harness";

describe("the fields a request carries", () => {
	it("adds a query parameter the scan never saw, names it, and sends it", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.add_field/i }));

		const name = screen.getByLabelText(/api_studio\.field_name/i);

		await userEvent.clear(name);
		await userEvent.type(name, "tenant{Enter}");
		await userEvent.type(screen.getByLabelText("tenant"), "acme");
		await userEvent.type(screen.getByLabelText(/^id/), "42");
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() =>
			expect(sendApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: "http://localhost:5000/users/42?tenant=acme" }),
			),
		);
	});

	it("takes an added row back out, and leaves the declared ones alone", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.add_field/i }));
		await userEvent.type(screen.getByLabelText(/api_studio\.field_name/i), "{Escape}");

		expect(screen.getByRole("button", { name: /api_studio\.row_options param1/i })).toBeTruthy();

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.row_options param1/i }));
		await userEvent.click(await screen.findByRole("menuitem", { name: /api_studio\.remove_field/i }));

		expect(screen.queryByLabelText("param1")).toBeNull();
		expect(screen.getByLabelText(/^id/)).toBeTruthy();
	});

	it("gives a list parameter a row for each value, and sends them all", async () => {
		readProjectRoutes.mockResolvedValue(
			scanResult({
				routes: [
					route({
						path: "/packages",
						parameters: [
							{
								name: "filterValues",
								location: "query",
								required: false,
								description: null,
								schemaType: "List<string>",
								example: null,
							},
						],
					}),
				],
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByText("/packages"));
		await userEvent.type(screen.getByLabelText("filterValues"), "RTGI001");
		await userEvent.click(
			screen.getByRole("button", { name: /api_studio\.row_options filterValues/i }),
		);
		await userEvent.click(
			await screen.findByRole("menuitem", { name: /api_studio\.add_another_value/i }),
		);

		const rows = screen.getAllByLabelText("filterValues");

		expect(rows).toHaveLength(2);

		await userEvent.type(rows[1], "RTGI002");
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() =>
			expect(sendApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "http://localhost:5000/packages?filterValues=RTGI001&filterValues=RTGI002",
				}),
			),
		);
	});

	it("keeps a declared parameter out of the user's hands", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.row_options id/i }));

		expect(screen.queryByRole("menuitem", { name: /api_studio\.remove_field/i })).toBeNull();
		expect(
			await screen.findByRole("menuitem", { name: /api_studio\.add_another_value/i }),
		).toBeTruthy();
	});
});

describe("building and sending a request", () => {
	it("sends the request to whichever environment is chosen", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		expect(await screen.findByText("http://localhost:5000")).toBeTruthy();

		await userEvent.selectOptions(screen.getByRole("combobox"), "staging");

		expect(await screen.findByText("https://staging.example.com")).toBeTruthy();
		await waitFor(() =>
			expect(saveApiEnvironments).toHaveBeenCalledWith(
				PROJECT,
				expect.objectContaining({ activeId: "staging" }),
				expect.any(Array),
			),
		);
	});

	it("sends what the user filled in and shows the response", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.type(screen.getByLabelText(/^id/), "42");
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() =>
			expect(sendApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({ method: "GET", url: "http://localhost:5000/users/42" }),
			),
		);
		expect(await screen.findByText("200 OK")).toBeTruthy();
		expect(responseBody()).toContain('"id": "42"');
	});

	it("asks before a request leaves this machine", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.selectOptions(screen.getByRole("combobox"), "staging");
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		expect(sendApiRequest).not.toHaveBeenCalled();
		await userEvent.click(screen.getByRole("button", { name: /send_remote_confirm/i }));

		await waitFor(() =>
			expect(sendApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({ url: "https://staging.example.com/users/{id}" }),
			),
		);
	});

	it("seeds the body from the declared schema and sends what it shows", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		renderPage();

		await userEvent.click(await screen.findByText("/users"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));

		expect(screen.getByLabelText(/api_studio\.body/i)).toHaveProperty("value", SCHEMA_BODY);

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() =>
			expect(sendApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: "POST",
					body: SCHEMA_BODY,
					headers: expect.arrayContaining([{ name: "Content-Type", value: "application/json" }]),
				}),
			),
		);
	});

	it("sends the same body as form fields when the user switches to form", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		renderPage();

		await userEvent.click(await screen.findByText("/users"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body_form/i }));

		expect(
			screen
				.getAllByLabelText(/api_studio\.field_name/i)
				.map((input) => (input as HTMLInputElement).value),
		).toEqual(["name", "age"]);

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() =>
			expect(sendApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: "name=string&age=0",
					headers: expect.arrayContaining([
						{ name: "Content-Type", value: "application/x-www-form-urlencoded" },
					]),
				}),
			),
		);
	});

	it("says so when the JSON body cannot be parsed", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		renderPage();

		await userEvent.click(await screen.findByText("/users"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));
		await userEvent.type(screen.getByLabelText(/api_studio\.body/i), "{{");

		expect(await screen.findByText(/api_studio\.invalid_json/i)).toBeTruthy();
	});

	it("keeps the body a user saved when the project is scanned again", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		scanProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		readApiRequests.mockResolvedValue({
			location: "app",
			requests: {
				route_2: {
					mode: "json",
					json: '{"name":"Ada"}',
					entries: [],
					fields: {},
					response: null,
					savedAt: "2026-08-19T09:00:00.000Z",
				},
			},
		});
		renderPage();

		await userEvent.click(await screen.findByText("/users"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));

		await waitFor(() =>
			expect(screen.getByLabelText(/api_studio\.body/i)).toHaveProperty("value", '{"name":"Ada"}'),
		);

		await userEvent.click(screen.getByRole("button", { name: /scan_routes/i }));

		await waitFor(() => expect(scanProjectRoutes).toHaveBeenCalledWith(PROJECT));
		expect(screen.getByLabelText(/api_studio\.body/i)).toHaveProperty("value", '{"name":"Ada"}');
	});

	it("saves the body a user edits, keyed by route", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		renderPage();

		await userEvent.click(await screen.findByText("/users"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));
		await userEvent.clear(screen.getByLabelText(/api_studio\.body/i));
		await userEvent.type(screen.getByLabelText(/api_studio\.body/i), '{{"a":1}');

		await waitFor(
			() =>
				expect(saveApiRequest).toHaveBeenCalledWith(
					PROJECT,
					"route_2",
					expect.objectContaining({ mode: "json", json: '{"a":1}' }),
				),
			{ timeout: 2000 },
		);
	});

	it("names the model it could not read instead of showing an empty body", async () => {
		readProjectRoutes.mockResolvedValue(
			scanResult({
				routes: [
					route({
						id: "route_3",
						method: "POST",
						path: "/login",
						parameters: [],
						requestBody: {
							required: true,
							description: null,
							variants: [
								{
									mediaType: "application/json",
									schemaType: "LoginRequest",
									example: null,
									defaultBody: null,
								},
							],
						},
					}),
				],
			}),
		);
		renderPage();

		await userEvent.click(await screen.findByText("/login"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));

		expect(screen.getByText(/api_studio\.body_shape_unknown/i)).toBeTruthy();
		expect(screen.getByLabelText(/api_studio\.body/i)).toHaveProperty("value", "");
	});

	it("attaches a file to a form field, keeping the path rather than the bytes", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		renderPage();

		await userEvent.click(await screen.findByText("/users"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body_form/i }));
		await userEvent.click(screen.getAllByRole("button", { name: /api_studio\.send_as_file/i })[0]);

		expect(await screen.findByText("avatar.png")).toBeTruthy();

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() =>
			expect(sendApiRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					body: null,
					multipart: expect.arrayContaining([
						{ name: "name", filePath: "/Users/ada/Pictures/avatar.png" },
					]),
				}),
			),
		);
	});

	it("declares a value the scan could not see, for the user to place", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.environment$/i }));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.new_variable$/i }));

		const field = screen.getByLabelText(/api_studio\.variable_name/i);

		await userEvent.clear(field);
		await userEvent.type(field, "clientKey{Enter}");

		await waitFor(() =>
			expect(saveApiEnvironments).toHaveBeenLastCalledWith(
				PROJECT,
				expect.objectContaining({
					variables: [expect.objectContaining({ name: "clientKey", secret: false })],
				}),
				expect.any(Array),
			),
		);
	});

	it("takes a declared value back out, along with what was typed into it", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		readApiEnvironments.mockResolvedValue({
			activeId: "local",
			names: {},
			variables: [{ key: "custom-1", name: "clientKey", secret: true }],
			environments: [
				{
					id: "local",
					name: "Local",
					values: { baseUrl: "http://localhost:5000", "custom-1": "k-1" },
				},
			],
		});
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.environment$/i }));
		await userEvent.click(
			await screen.findByRole("button", { name: /api_studio\.variable_options clientKey/i }),
		);
		await userEvent.click(
			await screen.findByRole("menuitem", { name: /api_studio\.remove_variable/i }),
		);

		await waitFor(() =>
			expect(saveApiEnvironments).toHaveBeenCalledWith(
				PROJECT,
				expect.objectContaining({
					variables: [],
					environments: [expect.objectContaining({ values: { baseUrl: "http://localhost:5000" } })],
				}),
				expect.any(Array),
			),
		);
	});
	it("asks where saved requests belong the first time one is saved", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		readApiRequests.mockResolvedValue({ location: null, requests: {} });
		renderPage();

		await userEvent.click(await screen.findByText("/users"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));
		await userEvent.type(screen.getByLabelText(/api_studio\.body/i), " ");

		expect(await screen.findByText(/api_studio\.storage_title/i)).toBeTruthy();

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.storage_project/i }));

		await waitFor(() => expect(setApiRequestStorage).toHaveBeenCalledWith(PROJECT, "project"));
		expect(screen.getByText(/api_studio\.storage_in_project/i)).toBeTruthy();
	});

	it("does not ask again once a project has a home for them", async () => {
		readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
		renderPage();

		await userEvent.click(await screen.findByText("/users"));
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.body/i }));
		await userEvent.type(screen.getByLabelText(/api_studio\.body/i), " ");

		await waitFor(() => expect(saveApiRequest).toHaveBeenCalled());
		expect(screen.queryByText(/api_studio\.storage_title/i)).toBeNull();
		expect(screen.getByText(/api_studio\.storage_on_machine/i)).toBeTruthy();
	});

	it("stops asking about a host once it is always allowed", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.selectOptions(screen.getByRole("combobox"), "staging");
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		expect(sendApiRequest).not.toHaveBeenCalled();

		await userEvent.click(screen.getByRole("button", { name: /always_allow_host/i }));

		await waitFor(() => expect(sendApiRequest).toHaveBeenCalledTimes(1));
		await waitFor(() =>
			expect(allowApiHost).toHaveBeenCalledWith(PROJECT, "https://staging.example.com/users/{id}"),
		);

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() => expect(sendApiRequest).toHaveBeenCalledTimes(2));
		expect(screen.queryByRole("button", { name: /always_allow_host/i })).toBeNull();
	});

	it("keeps asking when the answer was only this once", async () => {
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.selectOptions(screen.getByRole("combobox"), "staging");
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));
		await userEvent.click(screen.getByRole("button", { name: /send_remote_confirm/i }));

		await waitFor(() => expect(sendApiRequest).toHaveBeenCalledTimes(1));
		expect(allowApiHost).not.toHaveBeenCalled();

		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		expect(await screen.findByRole("button", { name: /always_allow_host/i })).toBeTruthy();
	});

	it("asks nothing about a host the project already trusts", async () => {
		readAllowedHosts.mockResolvedValue(["staging.example.com"]);
		readProjectRoutes.mockResolvedValue(scanResult());
		renderPage();

		await userEvent.click(await screen.findByText("/users/{id}"));
		await userEvent.selectOptions(screen.getByRole("combobox"), "staging");
		await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

		await waitFor(() => expect(sendApiRequest).toHaveBeenCalledTimes(1));
		expect(screen.queryByRole("button", { name: /always_allow_host/i })).toBeNull();
	});
});
