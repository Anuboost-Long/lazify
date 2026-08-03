// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InitProjectSelectionRoute } from "../../src/renderer/app/routes/InitProjectSelectionRoute";
import { InitProjectSetupRoute } from "../../src/renderer/app/routes/InitProjectSetupRoute";
import { appSidebarPages } from "../../src/renderer/app/app-sidebar.constant";

const createProject = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const setSelectedTemplateId = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  Navigate: () => null,
  useNavigate: () => navigate
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

vi.mock("@renderer/features/init/pages/InitProjectSetupPage", () => ({
  InitProjectSetupPage: ({ onContinue }: { onContinue: () => void }) =>
    createElement("button", { onClick: onContinue }, "Continue")
}));

vi.mock("@renderer/features/init/pages/InitProjectSelectionPage", () => ({
  InitProjectSelectionPage: ({ onSelectTemplate }: { onSelectTemplate: (id: string) => void }) =>
    createElement("button", { onClick: () => onSelectTemplate("next-default") }, "Choose Next")
}));

vi.mock("@renderer/shared/hooks/use-lazify-store", () => ({
  useLazifyStore: () => ({
    busy: false,
    importedTemplateOptions: [],
    initSourceMode: "stack",
    packageName: "",
    projectDirectory: "/workspace",
    projectName: "demo",
    selectedImportedTemplate: null,
    selectedImportedTemplateId: "",
    selectedTemplateId: "next-default",
    templateOptions: [],
    loadImportedTemplate: vi.fn(),
    setInitSourceMode: vi.fn(),
    setPackageName: vi.fn(),
    setProjectName: vi.fn(),
    setSelectedTemplateId,
    pickProjectDirectory: vi.fn(),
    createProject,
    createOptionValues: {},
    setCreateOptionValues: vi.fn()
  })
}));

afterEach(() => {
  cleanup();
  createProject.mockReset();
  navigate.mockReset();
  setSelectedTemplateId.mockReset();
});

describe("nested Init Project routes", () => {
  it("keeps project creation progress out of standalone sidebar navigation", () => {
    expect(appSidebarPages.some((page) => page.path === "/init-project/progress")).toBe(false);
    expect(appSidebarPages.map((page) => page.id)).not.toContain("console");
  });

  it("opens the setup child route after a template is selected", () => {
    render(createElement(InitProjectSelectionRoute));

    fireEvent.click(screen.getByRole("button", { name: "Choose Next" }));

    expect(setSelectedTemplateId).toHaveBeenCalledWith("next-default");
    expect(navigate).toHaveBeenCalledWith("/init-project/setup");
  });

  it("starts creation and opens the progress child route", () => {
    render(createElement(InitProjectSetupRoute));

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(createProject).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/init-project/progress");
  });
});
