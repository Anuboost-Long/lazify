// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspacePage } from "../../src/renderer/features/workspace/pages/WorkspacePage";
import type { SyncedWorkspaceProject } from "../../src/renderer/shared/types/lazify";

const navigate = vi.hoisted(() => vi.fn());

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate
}));

vi.mock("@renderer/features/workspace/components/SessionsPane", () => ({
  SessionsPane: () => createElement("div", { "data-testid": "sessions-pane" })
}));

vi.mock("@renderer/shared/hooks/use-interface-settings", () => ({
  useInterfaceSettings: () => ({ showTooltips: false })
}));

vi.mock("@renderer/shared/hooks/use-date-time-format", () => ({
  useDateTimeFormat: () => ({ dateFormat: "YYYY-MM-DD", timeFormat: "24h" }),
  formatDate: () => "2026-08-03",
  formatTime: () => "00:00"
}));

function project(overrides: Partial<SyncedWorkspaceProject> = {}): SyncedWorkspaceProject {
  return {
    id: "demo",
    projectName: "Demo Project",
    projectPath: "/workspace/demo project",
    stack: "react-vite",
    framework: "react",
    metaFramework: "vite",
    packageManager: "npm",
    confidence: 1,
    lastSyncedAt: "2026-08-03T00:00:00.000Z",
    ...overrides
  };
}

function renderPage(options: {
  projects?: SyncedWorkspaceProject[];
  onSyncProject?: (projectPath?: string | null) => Promise<SyncedWorkspaceProject | null>;
  onRemoveProject?: (projectPath: string) => void;
} = {}) {
  const onSyncProject = options.onSyncProject ?? vi.fn().mockResolvedValue(null);
  const onRemoveProject = options.onRemoveProject ?? vi.fn();

  render(
    createElement(WorkspacePage, {
      syncedProjects: options.projects ?? [],
      onSyncProject,
      onRemoveProject
    })
  );

  return { onSyncProject, onRemoveProject };
}

beforeEach(() => {
  navigate.mockReset();
  globalThis.requestAnimationFrame ??= (callback) => globalThis.setTimeout(callback, 0);
  globalThis.cancelAnimationFrame ??= (id) => globalThis.clearTimeout(id);
});

afterEach(() => cleanup());

describe("WorkspacePage empty state", () => {
  it("renders both entry points and the sessions pane", () => {
    renderPage();

    expect(screen.getAllByRole("button", { name: "workspace.add_new_project" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "workspace.sync_project" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "workspace.sync_existing" })).toBeTruthy();
    expect(screen.getByTestId("sessions-pane")).toBeTruthy();
  });

  it("opens project initialization from both Add New Project buttons", async () => {
    const user = userEvent.setup();
    renderPage();

    for (const button of screen.getAllByRole("button", { name: "workspace.add_new_project" })) {
      await user.click(button);
    }

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, "/init-project");
    expect(navigate).toHaveBeenNthCalledWith(2, "/init-project");
  });

  it("syncs from both empty-state sync buttons", async () => {
    const user = userEvent.setup();
    const { onSyncProject } = renderPage();

    await user.click(screen.getByRole("button", { name: "workspace.sync_project" }));
    await waitFor(() => expect(onSyncProject).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "workspace.sync_existing" }));

    expect(onSyncProject).toHaveBeenCalledTimes(2);
    expect(onSyncProject).toHaveBeenNthCalledWith(1, undefined);
    expect(onSyncProject).toHaveBeenNthCalledWith(2, undefined);
  });

  it("disables every sync entry point while the folder sync is pending", async () => {
    let finish: ((value: null) => void) | undefined;
    const onSyncProject = vi.fn(
      () => new Promise<null>((resolve) => { finish = resolve; })
    );
    const user = userEvent.setup();
    renderPage({ onSyncProject });

    await user.click(screen.getByRole("button", { name: "workspace.sync_project" }));

    expect(
      (screen.getByRole("button", { name: "workspace.sync_project" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "workspace.sync_existing" }) as HTMLButtonElement).disabled
    ).toBe(true);

    finish?.(null);
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "workspace.sync_project" }) as HTMLButtonElement).disabled
      ).toBe(false)
    );
  });

  it("shows sync errors and lets the dismiss button close them", async () => {
    const user = userEvent.setup();
    renderPage({ onSyncProject: vi.fn().mockRejectedValue(new Error("Already synced here")) });

    await user.click(screen.getByRole("button", { name: "workspace.sync_project" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Already synced here");
    await user.click(screen.getByRole("button", { name: "global_term.dismiss" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull(), { timeout: 1000 });
  });
});

describe("WorkspacePage synced project controls", () => {
  it("opens a project card at its encoded workspace route", async () => {
    const user = userEvent.setup();
    renderPage({ projects: [project()] });

    await user.click(screen.getByRole("button", { name: "Open Demo Project" }));

    expect(navigate).toHaveBeenCalledWith(
      "/workspace/project/%2Fworkspace%2Fdemo%20project"
    );
  });

  it("opens a focused project card with the Enter key", () => {
    renderPage({ projects: [project()] });

    fireEvent.keyDown(screen.getByRole("button", { name: "Open Demo Project" }), {
      key: "Enter"
    });

    expect(navigate).toHaveBeenCalledOnce();
  });

  it("removes a project without also opening its card", async () => {
    const user = userEvent.setup();
    const { onRemoveProject } = renderPage({ projects: [project()] });

    await user.click(screen.getByRole("button", { name: "Remove Demo Project" }));

    expect(onRemoveProject).toHaveBeenCalledWith("/workspace/demo project");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("resyncs only the selected card without opening it", async () => {
    const user = userEvent.setup();
    const { onSyncProject } = renderPage({ projects: [project()] });

    await user.click(screen.getByRole("button", { name: "Resync" }));

    expect(onSyncProject).toHaveBeenCalledWith("/workspace/demo project");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("disables the card Resync button while that project is syncing", async () => {
    let finish: ((value: null) => void) | undefined;
    const onSyncProject = vi.fn(
      () => new Promise<null>((resolve) => { finish = resolve; })
    );
    const user = userEvent.setup();
    renderPage({ projects: [project()], onSyncProject });

    const resync = screen.getByRole("button", { name: "Resync" }) as HTMLButtonElement;
    await user.click(resync);
    expect(resync.disabled).toBe(true);

    finish?.(null);
    await waitFor(() => expect(resync.disabled).toBe(false));
  });
});
