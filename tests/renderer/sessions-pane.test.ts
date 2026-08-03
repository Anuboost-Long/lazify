// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionsPane } from "../../src/renderer/features/workspace/components/SessionsPane";
import type { PtySession } from "../../src/renderer/shared/types/lazify";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

function session(overrides: Partial<PtySession> = {}): PtySession {
  return {
    runId: "run-1",
    scriptName: "dev",
    projectPath: "/workspace/demo",
    projectName: "Demo",
    pid: 1234,
    startedAt: "2026-08-03T00:00:00.000Z",
    ports: [{ port: 5173, command: "vite", address: "http://localhost:5173" }],
    waiting: false,
    isAgent: false,
    ...overrides
  };
}

function setLazifyApi(options: {
  listSessions?: ReturnType<typeof vi.fn>;
  stopScript?: ReturnType<typeof vi.fn>;
} = {}) {
  const api = {
    listSessions: options.listSessions ?? vi.fn().mockResolvedValue([]),
    stopScript: options.stopScript ?? vi.fn().mockResolvedValue(undefined)
  };
  Object.defineProperty(globalThis, "lazify", { configurable: true, value: api });
  return api;
}

beforeEach(() => setLazifyApi());

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(globalThis, "lazify");
});

describe("SessionsPane", () => {
  it("loads sessions on mount and shows the empty state", async () => {
    const api = setLazifyApi();
    render(createElement(SessionsPane));

    expect(screen.getByText("sessions_pane.loading")).toBeTruthy();
    expect(await screen.findByText("sessions_pane.empty_title")).toBeTruthy();
    expect(api.listSessions).toHaveBeenCalledOnce();
  });

  it("refreshes the session list from the smallest header button", async () => {
    const api = setLazifyApi({
      listSessions: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([session()])
    });
    const user = userEvent.setup();
    render(createElement(SessionsPane));
    await screen.findByText("sessions_pane.empty_title");

    await user.click(screen.getByRole("button", { name: "global_term.refresh" }));

    expect(await screen.findByText("Demo")).toBeTruthy();
    expect(api.listSessions).toHaveBeenCalledTimes(2);
  });

  it("shows running count, process details, and detected ports", async () => {
    setLazifyApi({ listSessions: vi.fn().mockResolvedValue([session()]) });
    render(createElement(SessionsPane));

    expect(await screen.findByText("Demo")).toBeTruthy();
    expect(screen.getByText("dev")).toBeTruthy();
    expect(screen.getByText("PID 1234")).toBeTruthy();
    expect(screen.getByText(":5173")).toBeTruthy();
    expect(screen.getByText("sessions_pane.running_count:1")).toBeTruthy();
  });

  it("shows the no-port indicator for sessions without a detected server", async () => {
    setLazifyApi({ listSessions: vi.fn().mockResolvedValue([session({ ports: [] })]) });
    render(createElement(SessionsPane));

    expect(await screen.findByText("sessions_pane.no_ports")).toBeTruthy();
  });

  it("kills a session and removes its row", async () => {
    const api = setLazifyApi({ listSessions: vi.fn().mockResolvedValue([session()]) });
    const user = userEvent.setup();
    render(createElement(SessionsPane));
    await screen.findByText("Demo");

    await user.click(screen.getByRole("button", { name: "sessions_pane.kill" }));

    expect(api.stopScript).toHaveBeenCalledWith("run-1");
    await waitFor(() => expect(screen.queryByText("Demo")).toBeNull());
    expect(screen.getByText("sessions_pane.empty_title")).toBeTruthy();
  });

  it("recovers from a session-list failure without leaving the spinner stuck", async () => {
    setLazifyApi({ listSessions: vi.fn().mockRejectedValue(new Error("unavailable")) });
    render(createElement(SessionsPane));

    expect(await screen.findByText("sessions_pane.empty_title")).toBeTruthy();
    expect(screen.queryByText("sessions_pane.loading")).toBeNull();
  });
});
