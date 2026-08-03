// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { appRoute } from "../../src/renderer/app/app-routes";
import { appSidebarPages } from "../../src/renderer/app/app-sidebar.constant";
import { ImportTemplateRoute } from "../../src/renderer/app/routes/ImportTemplateRoute";
import { TemplateEditRoute } from "../../src/renderer/app/routes/TemplateEditRoute";
import { TemplatesRoute } from "../../src/renderer/app/routes/TemplatesRoute";

const navigate = vi.hoisted(() => vi.fn());
const loadImportedTemplate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ templateId: "template-1" })
}));

vi.mock("@renderer/shared/hooks/use-lazify-store", () => ({
  useLazifyStore: () => ({
    importedTemplateOptions: [],
    selectedImportedTemplate: null,
    selectedImportedTemplateId: "",
    loadImportedTemplate,
    removeImportedTemplate: vi.fn(),
    saveImportedTemplateChanges: vi.fn()
  })
}));

vi.mock("@renderer/features/templates/pages/TemplatesPage", () => ({
  TemplatesPage: ({
    onImportProject,
    onSelectTemplate
  }: {
    onImportProject: () => void;
    onSelectTemplate: (templateId: string) => void;
  }) =>
    createElement(
      "div",
      null,
      createElement("button", { onClick: onImportProject }, "Import project"),
      createElement(
        "button",
        { onClick: () => onSelectTemplate("template-1") },
        "Edit template"
      )
    )
}));

vi.mock("@renderer/features/templates/pages/ImportTemplatePage", () => ({
  ImportTemplatePage: ({
    onBack,
    onTemplateSaved
  }: {
    onBack: () => void;
    onTemplateSaved: (templateId: string) => Promise<void>;
  }) =>
    createElement(
      "div",
      null,
      createElement("button", { onClick: onBack }, "Back"),
      createElement(
        "button",
        { onClick: () => void onTemplateSaved("imported-1") },
        "Save imported template"
      )
    )
}));

vi.mock("@renderer/features/templates/pages/TemplateEditPage", () => ({
  TemplateEditPage: () => createElement("div", null, "Template editor")
}));

afterEach(() => {
  cleanup();
  navigate.mockReset();
  loadImportedTemplate.mockClear();
});

describe("combined Templates flow", () => {
  it("keeps import under Templates instead of standalone sidebar navigation", () => {
    expect(appRoute.templateImport).toBe("/templates/import");
    expect(appSidebarPages.map((page) => page.id)).not.toContain("importProject");
    expect(appSidebarPages.find((page) => page.id === "templates")?.path).toBe("/templates");
  });

  it("opens the nested import page from saved templates", () => {
    render(createElement(TemplatesRoute));

    fireEvent.click(screen.getByRole("button", { name: "Import project" }));

    expect(navigate).toHaveBeenCalledWith("/templates/import");
  });

  it("opens template editing on its own nested page", () => {
    render(createElement(TemplatesRoute));

    fireEvent.click(screen.getByRole("button", { name: "Edit template" }));

    expect(navigate).toHaveBeenCalledWith("/templates/template-1/edit");
  });

  it("loads the requested template when its edit page is opened directly", async () => {
    render(createElement(TemplateEditRoute));

    await waitFor(() => expect(loadImportedTemplate).toHaveBeenCalledWith("template-1"));
    expect(screen.getByText("Template editor")).toBeTruthy();
  });

  it("opens a newly imported template on its dedicated editor page", async () => {
    render(createElement(ImportTemplateRoute));

    fireEvent.click(screen.getByRole("button", { name: "Save imported template" }));

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/templates/imported-1/edit")
    );
  });
});
