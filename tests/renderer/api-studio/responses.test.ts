// @vitest-environment jsdom

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

import { PROJECT, exportPostmanCollection, postRoute, project, readApiRequests, readApiResponseBody, readProjectRoutes, readRouteDetails, renderPage, responseBody, route, saveApiRequest, scanResult, sendApiRequest } from "./harness";

describe("reading a response", () => {
  it("shows the response it kept from the last run", async () => {
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    readApiRequests.mockResolvedValue({
      location: "app",
      requests: {
        route_2: {
          mode: "json",
          json: "{}",
          entries: [],
          fields: {},
          savedAt: "2026-08-19T09:00:00.000Z",
          response: {
          status: 201,
          statusText: "Created",
          durationMs: 24,
          headers: [],
          mediaType: "application/json",
          body: '{"id":7}',
          bodyBytes: 8,
          truncated: false,
            receivedAt: "2026-08-19T09:00:00.000Z"
          }
        }
      }
    });
    renderPage();

    await userEvent.click(await screen.findByText("/users"));

    expect(await screen.findByText("201 Created")).toBeTruthy();
    expect(responseBody()).toContain('"id": 7');
    expect(sendApiRequest).not.toHaveBeenCalled();
  });

  it("lets the response be dragged taller or folded away", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await screen.findByText("/users/{id}");

    const divider = screen.getByRole("separator", { name: /api_studio\.resize_response/i });

    expect(divider.getAttribute("aria-orientation")).toBe("horizontal");

    await userEvent.click(screen.getByRole("button", { name: "api_studio.response" }));

    expect(screen.queryByRole("separator", { name: /api_studio\.resize_response/i })).toBeNull();
    expect(screen.getByText(/api_studio\.response/i)).toBeTruthy();
    expect(globalThis.localStorage.getItem("lazify-api-studio-response-open")).toBe("false");

    await userEvent.click(screen.getByRole("button", { name: "api_studio.response" }));

    expect(
      screen.getByRole("separator", { name: /api_studio\.resize_response/i })
    ).toBeTruthy();
  });

  it("opens a folded response again when one comes back", async () => {
    globalThis.localStorage.setItem("lazify-api-studio-response-open", "false");
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    expect(screen.queryByRole("separator", { name: /api_studio\.resize_response/i })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    expect(await screen.findByText("200 OK")).toBeTruthy();
    expect(screen.getByRole("separator", { name: /api_studio\.resize_response/i })).toBeTruthy();
  });

  it("wraps a long response line instead of scrolling it sideways", async () => {
    const line = `token ${"x".repeat(400)}`;

    sendApiRequest.mockResolvedValue({
      ok: true,
      response: {
        status: 200,
        statusText: "OK",
        durationMs: 8,
        headers: [],
        mediaType: "text/plain",
        body: line,
        bodyBytes: line.length,
        truncated: false
      }
    });
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    await screen.findByText("200 OK");

    const shown = screen.getByLabelText(/api_studio\.response/i);

    expect(shown.textContent).toBe(line);
    expect(shown.className).toContain("whitespace-pre-wrap");
    expect(shown.className).toContain("overflow-x-hidden");
  });

  it("keeps a JSON response indented while a long value wraps", async () => {
    const token = "x".repeat(400);

    sendApiRequest.mockResolvedValue({
      ok: true,
      response: {
        status: 200,
        statusText: "OK",
        durationMs: 8,
        headers: [],
        mediaType: "application/json",
        body: JSON.stringify({ id: 7, token, nested: { name: "Ada" } }),
        bodyBytes: 420,
        truncated: false
      }
    });
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    await screen.findByText("200 OK");

    const shown = screen.getByLabelText(/api_studio\.response/i);

    /** One row per line, so indentation is what proves it is still formatted. */
    expect(shown.textContent).toContain('  "id": 7,');
    expect(shown.textContent).toContain(`  "token": "${token}",`);
    expect(shown.textContent).toContain('    "name": "Ada"');
    expect(shown.className).toContain("whitespace-pre-wrap");
  });

  it("saves a response as an example and shows it again alongside the live one", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));
    await screen.findByText("200 OK");
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.save_response/i }));

    expect(await screen.findByRole("button", { name: "200 OK" })).toBeTruthy();
    await waitFor(() =>
      expect(saveApiRequest).toHaveBeenCalledWith(
        PROJECT,
        "route_1",
        expect.objectContaining({
          examples: [expect.objectContaining({ name: "200 OK", body: '{"id":"42"}' })]
        })
      )
    );

    await userEvent.click(
      screen.getByRole("button", { name: /api_studio\.remove_example 200 OK/i })
    );

    expect(screen.queryByRole("button", { name: "200 OK" })).toBeNull();
  });

  it("formats a body its media type never claimed was JSON, and hands back the raw one", async () => {
    sendApiRequest.mockResolvedValue({
      ok: true,
      response: {
        status: 200,
        statusText: "OK",
        durationMs: 8,
        headers: [],
        mediaType: "text/plain",
        body: '{"id":7,"name":"Ada"}',
        bodyBytes: 21,
        truncated: false
      }
    });
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    await screen.findByText("200 OK");
    expect(responseBody()).toContain('"name": "Ada"');

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.body_raw/i }));
    expect(responseBody()).toBe('{"id":7,"name":"Ada"}');

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.body_pretty/i }));
    expect(responseBody()).toContain('"name": "Ada"');
  });

  it("leaves only the raw view when a body cannot be parsed", async () => {
    sendApiRequest.mockResolvedValue({
      ok: true,
      response: {
        status: 200,
        statusText: "OK",
        durationMs: 8,
        headers: [],
        mediaType: "application/json",
        body: '{"data":[{"id":1,',
        bodyBytes: 17,
        truncated: true
      }
    });
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    const pretty = await screen.findByRole("button", { name: /api_studio\.body_pretty/i });

    expect(pretty).toHaveProperty("disabled", true);
    expect(responseBody()).toBe('{"data":[{"id":1,');
    expect(screen.getByText(/api_studio\.response_truncated/i)).toBeTruthy();
  });

  it("reads a huge response from the top until it is asked for the rest", async () => {
    const rows = Array.from({ length: 2000 }, (_, at) => ({ id: at, note: "x".repeat(40) }));
    const body = JSON.stringify({ data: rows });

    sendApiRequest.mockResolvedValue({
      ok: true,
      response: {
        status: 200,
        statusText: "OK",
        durationMs: 40,
        headers: [],
        mediaType: "application/json",
        body,
        bodyBytes: body.length,
        truncated: false
      }
    });
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));
    await screen.findByText("200 OK");

    const held = screen.getByRole("button", { name: /api_studio\.showing_first_lines/i });

    /** The first rows are there to read; the last are not, until asked for. */
    expect(held).toBeTruthy();
    expect(responseBody()).toContain('"id": 0');
    expect(responseBody()).not.toContain('"id": 1999');

    await userEvent.click(held);

    expect(screen.queryByRole("button", { name: /api_studio\.showing_first_lines/i })).toBeNull();
    expect(responseBody()).toContain('"id": 1999');
  }, 20_000);

  it("shows a saved example's body after the app has been reopened", async () => {
    const example = {
      id: "example-1",
      name: "200 OK",
      status: 200,
      statusText: "OK",
      durationMs: 667,
      headers: [],
      mediaType: "application/json",
      body: '{"token":"kept"}',
      bodyBytes: 16,
      truncated: false,
      receivedAt: "2026-08-19T09:00:00.000Z"
    };
    const saved = {
      mode: "json" as const,
      json: "",
      entries: [],
      fields: {},
      response: null,
      savedAt: "2026-08-19T09:00:00.000Z",
      /** The index knows the example; only the body file knows its body. */
      examples: [{ ...example, body: "", bodyFile: "abc-example-1.txt" }]
    };

    readProjectRoutes.mockResolvedValue(scanResult());
    readApiRequests.mockResolvedValue({ location: "project", requests: { route_1: saved } });
    readApiResponseBody.mockResolvedValue(example.body);
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(await screen.findByRole("button", { name: "200 OK" }));

    await waitFor(() => expect(responseBody()).toContain('"token": "kept"'));
  });

  it("keeps a loaded example when the route's details arrive after it", async () => {
    const example = {
      id: "example-1",
      name: "200 OK",
      status: 200,
      statusText: "OK",
      durationMs: 301,
      headers: [],
      mediaType: "application/json",
      body: '{"data":{"access_token":"abc.def"}}',
      bodyBytes: 35,
      truncated: false,
      receivedAt: "2026-08-19T09:00:00.000Z"
    };
    const saved = {
      mode: "json" as const,
      json: "",
      entries: [],
      fields: {},
      response: null,
      savedAt: "2026-08-19T09:00:00.000Z",
      examples: [{ ...example, body: "", bodyFile: "abc-example-1.txt" }]
    };

    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    readApiRequests.mockResolvedValue({ location: "project", requests: { route_2: saved } });
    readApiResponseBody.mockResolvedValue('{"data":{"access_token":"abc.def"}}');
    /** The detail file lands after the body does, changing the declared body. */
    readRouteDetails.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve([
                {
                  id: "route_2",
                  description: null,
                  parameters: [],
                  responses: [],
                  requestBody: {
                    required: true,
                    description: null,
                    variants: [
                      {
                        mediaType: "application/json",
                        schemaType: "LoginRequest",
                        example: null,
                        defaultBody: '{"userName":"string"}'
                      }
                    ]
                  }
                }
              ]),
            60
          )
        )
    );
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(await screen.findByRole("button", { name: "200 OK" }));

    /** The seed that follows the details must not undo the body already read. */
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(responseBody()).toContain("access_token");
  });

  it("reads a body by the file the index names, and only when it is shown", async () => {
    const saved = {
      mode: "json" as const,
      json: "",
      entries: [],
      fields: {},
      response: null,
      savedAt: "2026-08-19T09:00:00.000Z",
      examples: [
        {
          id: "example-1",
          name: "200 OK",
          status: 200,
          statusText: "OK",
          durationMs: 301,
          headers: [],
          mediaType: "application/json",
          body: "",
          bodyFile: "a73122c6b5af-example-1.txt",
          bodyBytes: 35,
          truncated: false,
          receivedAt: "2026-08-19T09:00:00.000Z"
        }
      ]
    };

    readProjectRoutes.mockResolvedValue(scanResult());
    readApiRequests.mockResolvedValue({ location: "project", requests: { route_1: saved } });
    readApiResponseBody.mockResolvedValue('{"data":{"access_token":"abc.def"}}');
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(await screen.findByRole("button", { name: "200 OK" }));

    await waitFor(() =>
      expect(readApiResponseBody).toHaveBeenCalledWith(PROJECT, "a73122c6b5af-example-1.txt")
    );
    await waitFor(() => expect(responseBody()).toContain("access_token"));
  });

  it("exports the collection the project was scanned into", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await screen.findByText("/users/{id}");
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.export_collection/i }));

    await waitFor(() => expect(exportPostmanCollection).toHaveBeenCalledWith(PROJECT));
  });

  it("stays folded when a route already has a response to show", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    readApiRequests.mockResolvedValue({
      location: "app",
      requests: {
        route_1: {
          mode: "json",
          json: "",
          entries: [],
          fields: {},
          scripts: { pre: "", post: "" },
          examples: [],
          savedAt: "2026-08-20T09:00:00.000Z",
          response: {
            status: 200,
            statusText: "OK",
            durationMs: 12,
            headers: [],
            mediaType: "application/json",
            body: '{"id":"42"}',
            bodyBytes: 11,
            truncated: false,
            receivedAt: new Date().toISOString()
          }
        }
      }
    });
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    expect(await screen.findByText("200 OK")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "api_studio.response" }));

    expect(screen.queryByRole("separator", { name: /api_studio\.resize_response/i })).toBeNull();
    expect(screen.queryByText("200 OK")).toBeNull();
  });

  it("opens again when the next response arrives, not on every repaint", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    expect(await screen.findByText("200 OK")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "api_studio.response" }));

    expect(screen.queryByText("200 OK")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    expect(await screen.findByText("200 OK")).toBeTruthy();
  });
});
