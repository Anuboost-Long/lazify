// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PtySession } from "../../src/renderer/shared/types/lazify";

/**
 * Imported per test rather than once at the top: the tab layout is read out of
 * localStorage when the module is first evaluated, which is what makes a reload
 * pick up where the last one left off — so each test has to seed storage before
 * the module exists.
 */
async function mountPane(projectPath = PROJECT) {
  const { ScriptsPane } = await import(
    "../../src/renderer/features/workspace/components/ScriptsPane"
  );

  return render(createElement(ScriptsPane, { projectPath }));
}

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

// xterm needs a real canvas to open on; the pane is what is under test here.
vi.mock("../../src/renderer/features/workspace/components/XTermPanel", () => ({
  XTermPanel: ({ runId }: { runId: string }) =>
    createElement("div", { "data-terminal": runId })
}));

const PROJECT = "/workspace/demo";
const STORAGE_KEY = "lazify-script-tabs";

function session(overrides: Partial<PtySession> = {}): PtySession {
  return {
    runId: "pty-live",
    scriptName: "dev",
    projectPath: PROJECT,
    projectName: "Demo",
    pid: 1234,
    startedAt: "2026-08-03T00:00:00.000Z",
    ports: [],
    waiting: false,
    isAgent: false,
    ...overrides
  };
}

/** A tab layout left behind by an earlier run of the app. */
function persistTabs(runId: string | null, status: string) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      [PROJECT]: {
        tabs: [{ tabId: "tab-init", index: 1, runId, scriptName: "dev", status }],
        activeTabId: "tab-init"
      }
    })
  );
}

function setLazifyApi(sessions: PtySession[]) {
  const api = {
    listScripts: vi.fn().mockResolvedValue({ dev: "vite" }),
    listSessions: vi.fn().mockResolvedValue(sessions),
    onScriptStatus: vi.fn().mockReturnValue(() => {}),
    runScript: vi.fn().mockResolvedValue({ runId: "pty-new" }),
    restartScript: vi.fn().mockResolvedValue({ runId: "pty-new" }),
    stopScript: vi.fn().mockResolvedValue(undefined)
  };

  Object.defineProperty(globalThis, "lazify", { configurable: true, value: api });
  return api;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => cleanup());

describe("scripts pane reattaching to sessions", () => {
  it("re-attaches to a run that is still alive", async () => {
    persistTabs("pty-live", "running");
    const api = setLazifyApi([session()]);

    const { container } = await mountPane();

    await waitFor(() => expect(api.listSessions).toHaveBeenCalled());

    expect(
      container.querySelector("[data-terminal]")?.getAttribute("data-terminal")
    ).toBe("pty-live");
    expect(screen.queryByText("scripts_pane.session_ended")).toBeNull();
  });

  it("retires a run that died while the pane was away, rather than showing an empty terminal", async () => {
    persistTabs("pty-gone", "running");
    // The session list no longer carries it: the process is gone, and so is the
    // transcript a terminal would have replayed.
    setLazifyApi([]);

    const { container } = await mountPane();

    await waitFor(() =>
      expect(screen.getByText("scripts_pane.session_ended")).toBeTruthy()
    );
    expect(container.querySelector("[data-terminal]")).toBeNull();
  });

  it("leaves a run belonging to another project alone", async () => {
    persistTabs("pty-live", "running");
    setLazifyApi([session({ projectPath: "/workspace/other" })]);

    await mountPane();

    await waitFor(() =>
      expect(screen.getByText("scripts_pane.session_ended")).toBeTruthy()
    );
  });

  it("persists the retirement, so the next reload does not resurrect a dead run", async () => {
    persistTabs("pty-gone", "running");
    setLazifyApi([]);

    await mountPane();

    await waitFor(() =>
      expect(screen.getByText("scripts_pane.session_ended")).toBeTruthy()
    );

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
    expect(stored[PROJECT].tabs[0]).toMatchObject({ runId: null, status: "done" });
  });
});
