// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectTreeEditor } from "../../src/renderer/shared/ui/project-tree/core/ProjectTreeEditor";
import type { FileContentState } from "../../src/renderer/shared/ui/project-tree/core/types";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

const SVG_SOURCE = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4" /></svg>';

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => cleanup());

function renderPane(name: string, state: FileContentState) {
  return render(
    createElement(ProjectTreeEditor, {
      selectedNode: { name, type: "file" as const, absolutePath: `/demo/${name}` },
      selectedFileState: state
    })
  );
}

describe("editor pane previews", () => {
  it("renders an image file instead of its bytes", () => {
    const { container } = renderPane("hero.png", {
      status: "loaded",
      content: "aGVsbG8=",
      mimeType: "image/png",
      byteLength: 2048
    });

    const image = container.querySelector("img");

    expect(image?.getAttribute("src")).toBe("blob:preview");
    expect(image?.getAttribute("alt")).toBe("hero.png");
    expect(screen.getByText(/2 KB/)).toBeTruthy();
  });

  it("renders a PDF in a frame of its own", () => {
    const { container } = renderPane("spec.pdf", {
      status: "loaded",
      content: "JVBERi0=",
      mimeType: "application/pdf",
      byteLength: 4096
    });

    expect(container.querySelector("iframe")?.getAttribute("src")).toBe("blob:preview");
  });

  it("opens an SVG as the picture and switches to its source on request", async () => {
    const user = userEvent.setup();
    const { container } = renderPane("logo.svg", {
      status: "loaded",
      content: SVG_SOURCE
    });

    expect(container.querySelector("img")?.getAttribute("alt")).toBe("logo.svg");

    await user.click(screen.getByText("project_tree.preview_code"));

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("circle");
  });

  it("leaves a code file on the code surface, with no preview toggle", () => {
    const { container } = renderPane("index.ts", {
      status: "loaded",
      content: "export const answer = 42;"
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("export const answer = 42;");
    expect(screen.queryByText("project_tree.preview_code")).toBeNull();
  });

  it("reads an image as code when the loader gave it no bytes", () => {
    const { container } = renderPane("hero.png", {
      status: "loaded",
      content: "Preview unavailable for binary file.\n"
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Preview unavailable for binary file.");
  });
});
