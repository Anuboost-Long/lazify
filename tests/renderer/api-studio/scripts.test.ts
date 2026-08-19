// @vitest-environment jsdom

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

import { PROJECT, postRoute, project, readApiRequests, readProjectRoutes, readScriptSettings, renderPage, route, runApiRequest, saveApiEnvironments, saveApiRequest, saveScriptSettings, scanResult, sendApiRequest } from "./harness";

describe("scripts that run with a request", () => {
  it("saves the pre-request script a user writes", async () => {
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.scripts$/i }));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.pre_request$/i }));
    await userEvent.type(
      screen.getByLabelText(/api_studio\.pre_request/i),
      'lz.log("before")'
    );

    await waitFor(
      () =>
        expect(saveApiRequest).toHaveBeenCalledWith(
          PROJECT,
          "route_2",
          expect.objectContaining({ scripts: { pre: 'lz.log("before")', post: "" } })
        ),
      { timeout: 2000 }
    );
  });

  it("runs a route's scripts with the request and shows what they checked", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    readApiRequests.mockResolvedValue({
      location: "app",
      requests: {
        route_1: {
          mode: "json",
          json: "",
          entries: [],
          fields: {},
          scripts: { pre: "", post: 'lz.env.set("token", "minted");' },
          response: null,
          examples: [],
          savedAt: "2026-08-19T09:00:00.000Z"
        }
      }
    });
    runApiRequest.mockImplementation(async (input: { draft: unknown }) => ({
      outcome: await sendApiRequest(input.draft),
      pre: null,
      post: {
        logs: ["kept the token"],
        checks: [{ name: "returns 200", passed: true, detail: null }],
        error: null,
        durationMs: 3
      },
      changedValues: { token: "minted" }
    }));
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    await waitFor(() =>
      expect(runApiRequest).toHaveBeenCalledWith(
        expect.objectContaining({ scripts: { pre: "", post: 'lz.env.set("token", "minted");' } })
      )
    );

    expect(await screen.findByText("returns 200")).toBeTruthy();
    expect(screen.getByText("kept the token")).toBeTruthy();

    await waitFor(() =>
      expect(saveApiEnvironments).toHaveBeenCalledWith(
        PROJECT,
        expect.objectContaining({
          environments: expect.arrayContaining([
            expect.objectContaining({ id: "local", values: expect.objectContaining({ token: "minted" }) })
          ])
        }),
        expect.arrayContaining(["token"])
      )
    );
  });

  it("suggests what a script can reach as it is typed", async () => {
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.scripts$/i }));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.post_response$/i }));
    await userEvent.type(screen.getByLabelText(/api_studio\.post_response/i), "lz.");

    expect(await screen.findByText(/api_studio\.suggestion_keys/i)).toBeTruthy();
    expect(screen.getByText("env")).toBeTruthy();
    expect(screen.getByText("test")).toBeTruthy();

    await userEvent.click(screen.getByText("env"));

    await waitFor(() =>
      expect(screen.getByLabelText(/api_studio\.post_response/i)).toHaveProperty(
        "value",
        "lz.env"
      )
    );
  });

  it("documents the script API and inserts a recipe into the right script", async () => {
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.scripts$/i }));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.how_scripts_work/i }));

    expect(await screen.findByText(/api_studio\.what_you_can_write/i)).toBeTruthy();
    expect(screen.getByText("Send the kept token on this request")).toBeTruthy();

    await userEvent.click(screen.getAllByRole("button", { name: /api_studio\.insert_recipe/i })[0]);

    await waitFor(() =>
      expect(saveApiRequest).toHaveBeenCalledWith(
        PROJECT,
        "route_2",
        expect.objectContaining({
          scripts: expect.objectContaining({
            pre: expect.stringContaining("lz.request.headers.set")
          })
        })
      )
    );
  });

  it("writes scripts under the name the project chose", async () => {
    readScriptSettings.mockResolvedValue({ global: "api" });
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.scripts$/i }));
    await userEvent.type(screen.getByLabelText(/api_studio\.pre_request/i), "api.");

    expect(await screen.findByText("stop")).toBeTruthy();
  });

  it("suggests the script's own names when no response has come back yet", async () => {
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    readApiRequests.mockResolvedValue({
      location: "app",
      requests: {
        route_2: {
          mode: "json",
          json: "",
          entries: [],
          fields: {},
          scripts: { pre: "", post: "const jsonData = lz.response.json();\n" },
          response: null,
          examples: [],
          savedAt: "2026-08-19T09:00:00.000Z"
        }
      }
    });
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.scripts$/i }));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.post_response$/i }));

    const editor = screen.getByLabelText(/api_studio\.post_response/i);

    await userEvent.click(editor);
    await userEvent.type(editor, "jsonData.");

    const popup = (await screen.findByText(/api_studio\.suggestion_keys/i)).parentElement!;

    expect(within(popup).getByText("jsonData")).toBeTruthy();
    expect(within(popup).getByText("response")).toBeTruthy();
  });

  it("routes console.log into the same strip lz.log uses", async () => {
    readProjectRoutes.mockResolvedValue(scanResult());
    runApiRequest.mockImplementation(async (input: { draft: unknown }) => ({
      outcome: await sendApiRequest(input.draft),
      pre: null,
      post: { logs: ["saved the token"], checks: [], error: null, durationMs: 1 },
      changedValues: null
    }));
    renderPage();

    await userEvent.click(await screen.findByText("/users/{id}"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.send$/i }));

    expect(await screen.findByText("saved the token")).toBeTruthy();
  });

  it("offers to switch when a Postman script is pasted in", async () => {
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.scripts$/i }));
    await userEvent.type(
      screen.getByLabelText(/api_studio\.pre_request/i),
      'pm.environment.set("token", 1)'
    );

    expect(await screen.findByText(/api_studio\.postman_detected$/i)).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.use_postman_names/i }));

    await waitFor(() =>
      expect(saveScriptSettings).toHaveBeenCalledWith(PROJECT, { global: "pm" })
    );
  });

  it("leaves the notice behind once it is waved off", async () => {
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.scripts$/i }));
    await userEvent.type(screen.getByLabelText(/api_studio\.pre_request/i), "pm.response.code");

    await userEvent.click(screen.getByRole("button", { name: /api_studio\.keep_this_dialect/i }));

    expect(screen.queryByText(/api_studio\.postman_detected$/i)).toBeNull();
    expect(saveScriptSettings).not.toHaveBeenCalled();
  });

  it("suggests Postman's names once the project uses them", async () => {
    readScriptSettings.mockResolvedValue({ global: "pm" });
    readProjectRoutes.mockResolvedValue(scanResult({ routes: [postRoute()] }));
    renderPage();

    await userEvent.click(await screen.findByText("/users"));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.scripts$/i }));
    await userEvent.click(screen.getByRole("button", { name: /api_studio\.post_response$/i }));
    await userEvent.type(screen.getByLabelText(/api_studio\.post_response/i), "pm.");

    const popup = (await screen.findByText(/api_studio\.suggestion_keys/i)).parentElement!;

    expect(within(popup).getByText("environment")).toBeTruthy();
    expect(within(popup).getByText("response")).toBeTruthy();
    expect(within(popup).queryByText("env")).toBeNull();
  });
});
