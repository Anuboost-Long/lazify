// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectCreationProgressPage } from "../../src/renderer/features/init/pages/ProjectCreationProgressPage";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

vi.mock("@renderer/shared/ui/LogPanel", () => ({
  LogPanel: () => createElement("div", { "data-testid": "log-panel" })
}));

vi.mock("@renderer/shared/ui/StatusStrip", () => ({
  StatusStrip: ({ statusMessage }: { statusMessage: string }) =>
    createElement("div", { "data-testid": "status-strip" }, statusMessage)
}));

vi.mock("@renderer/shared/ui/StarterFailureNotice", () => ({
  StarterFailureNotice: () => createElement("div", { "data-testid": "starter-failure" })
}));

afterEach(() => cleanup());

const baseProps: Parameters<typeof ProjectCreationProgressPage>[0] = {
  commandChoicePrompt: null,
  environment: null,
  logs: [],
  projectName: "Demo",
  starterFailureReason: null,
  statusMessage: "Starting project creation.",
  workflowStatus: "running",
  onChooseCommandOption: vi.fn()
};

function renderPage(overrides: Partial<typeof baseProps> = {}) {
  return render(createElement(ProjectCreationProgressPage, { ...baseProps, ...overrides }));
}

describe("ProjectCreationProgressPage", () => {
  it("presents command output as the second step of Init Project", () => {
    renderPage();

    expect(screen.getByText("console.flow_title")).toBeTruthy();
    expect(screen.getByText("console.setup_step")).toBeTruthy();
    expect(screen.getByText("console.creation_step")).toBeTruthy();
    expect(screen.getByTestId("status-strip")).toBeTruthy();
  });

  it("opens an attention-grabbing dialog when project creation fails", () => {
    renderPage({
      workflowStatus: "error",
      statusMessage: "npm install failed with exit code 1"
    });

    const dialog = screen.getByRole("alertdialog", {
      name: "console.project_creation_failed"
    });
    expect(dialog.textContent).toContain("npm install failed with exit code 1");
    expect(screen.queryByTestId("status-strip")).toBeNull();
  });

  it("opens when a running creation workflow transitions to an error", () => {
    const { rerender } = renderPage();
    expect(screen.queryByRole("alertdialog")).toBeNull();

    rerender(
      createElement(ProjectCreationProgressPage, {
        ...baseProps,
        workflowStatus: "error",
        statusMessage: "Project directory is not writable"
      })
    );

    expect(screen.getByRole("alertdialog").textContent).toContain(
      "Project directory is not writable"
    );
    expect(screen.queryByTestId("status-strip")).toBeNull();
  });

  it("dismisses the dialog with its OK button", async () => {
    const user = userEvent.setup();
    renderPage({ workflowStatus: "error", statusMessage: "Creation failed" });

    await user.click(screen.getByRole("button", { name: "global_term.ok" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("allows only the command-provided options and sends their IDs", async () => {
    const user = userEvent.setup();
    const onChooseCommandOption = vi.fn();
    renderPage({
      commandChoicePrompt: {
        id: "prompt-1",
        commandId: "command-1",
        message: "Select a package manager",
        options: [
          { id: "option-1", label: "npm" },
          { id: "option-2", label: "pnpm" }
        ]
      },
      onChooseCommandOption
    });

    expect(screen.queryByRole("textbox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "pnpm" }));

    expect(onChooseCommandOption).toHaveBeenCalledWith("prompt-1", "option-2");
  });

});
