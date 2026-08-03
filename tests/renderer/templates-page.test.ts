// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TemplatesPage } from "../../src/renderer/features/templates/pages/TemplatesPage";
import { TemplateEditPage } from "../../src/renderer/features/templates/pages/TemplateEditPage";

const projectTreeEditor = vi.hoisted(() =>
  vi.fn((_props: Record<string, unknown>) => null)
);

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

vi.mock("@renderer/shared/ui/project-tree/ProjectTreeEditorPanel", () => ({
  ProjectTreeEditorPanel: projectTreeEditor
}));

afterEach(() => {
  cleanup();
  projectTreeEditor.mockClear();
});

describe("TemplatesPage", () => {
  it("shows one clear import action when the library is empty", () => {
    render(
      createElement(TemplatesPage, {
        importedTemplateOptions: [],
        onSelectTemplate: vi.fn(),
        onDeleteTemplate: vi.fn(),
        onImportProject: vi.fn()
      })
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toContain("templates.import_project");
  });

  it("filters template items by name, stack, and source", () => {
    const options = [
      {
        id: "template-1",
        name: "Mobile Starter",
        description: "Reusable Expo app",
        sourceProjectPath: "/projects/mobile",
        savedAt: "2026-08-03T00:00:00.000Z",
        fileCount: 12,
        stack: "react-native-expo" as const
      },
      {
        id: "template-2",
        name: "API Starter",
        description: "Node service baseline",
        sourceProjectPath: "/projects/backend",
        savedAt: "2026-08-02T00:00:00.000Z",
        fileCount: 8,
        stack: "node-api" as const
      }
    ];

    render(
      createElement(TemplatesPage, {
        importedTemplateOptions: options,
        onSelectTemplate: vi.fn(),
        onDeleteTemplate: vi.fn(),
        onImportProject: vi.fn()
      })
    );

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "templates.search_placeholder"
      }),
      { target: { value: "backend" } }
    );

    expect(screen.getByText("API Starter")).toBeTruthy();
    expect(screen.queryByText("Mobile Starter")).toBeNull();

    fireEvent.change(
      screen.getByRole("searchbox", {
        name: "templates.search_placeholder"
      }),
      { target: { value: "missing" } }
    );
    expect(screen.getByText("templates.no_search_results")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "templates.clear_search" })
    );
    expect(screen.getByText("Mobile Starter")).toBeTruthy();
  });

  it("opens the selected template in the dedicated full workbench editor page", () => {
    const option = {
      id: "template-1",
      name: "Starter",
      description: "Reusable starter",
      sourceProjectPath: "/projects/starter",
      savedAt: "2026-08-03T00:00:00.000Z",
      fileCount: 1,
      stack: "react-vite" as const
    };
    const snapshot = {
      ...option,
      tree: []
    } as unknown as NonNullable<Parameters<typeof TemplateEditPage>[0]["template"]>;

    render(
      createElement(TemplateEditPage, {
        template: snapshot,
        onBack: vi.fn(),
        onSaveTemplate: vi.fn(),
        onDeleteTemplate: vi.fn(),
      })
    );

    expect(projectTreeEditor.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({
        layout: "workbench",
        replaceTreeOnInitialChange: true
      })
    );
  });
});
