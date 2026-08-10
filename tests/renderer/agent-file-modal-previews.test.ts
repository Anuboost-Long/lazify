// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AgentFileModal } from "../../src/renderer/features/agents/components/AgentFileModal";
import type { ImportedProjectIndexNode } from "../../src/renderer/shared/types/lazify";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "en", language: "en" }
  })
}));

const readImportedProjectFile = vi.fn<(filePath: string) => Promise<string>>();
const readProjectAssetFile = vi.fn();

beforeEach(() => {
  readImportedProjectFile.mockReset();
  readProjectAssetFile.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();

  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: { readImportedProjectFile, readProjectAssetFile }
  });
});

afterEach(() => cleanup());

function fileNode(name: string): ImportedProjectIndexNode {
  return {
    id: name,
    name,
    type: "file",
    relativePath: `assets/${name}`,
    absolutePath: `/demo/assets/${name}`,
    children: []
  };
}

function renderModal(name: string) {
  return render(
    createElement(AgentFileModal, {
      file: fileNode(name),
      onSendToTerminal: null,
      onClose: vi.fn()
    })
  );
}

describe("agent file modal previews", () => {
  it("fetches an image's bytes and shows the picture", async () => {
    readProjectAssetFile.mockResolvedValue({
      mimeType: "image/png",
      base64: "aGVsbG8=",
      byteLength: 2048
    });

    renderModal("hero.png");

    await waitFor(() => {
      expect(document.body.querySelector("img")?.getAttribute("alt")).toBe("hero.png");
    });
    expect(readProjectAssetFile).toHaveBeenCalledWith("/demo/assets/hero.png");
    expect(readImportedProjectFile).not.toHaveBeenCalled();
    expect(screen.getByText(/2 KB/)).toBeTruthy();
  });

  it("shows a PDF in its own frame", async () => {
    readProjectAssetFile.mockResolvedValue({
      mimeType: "application/pdf",
      base64: "JVBERi0=",
      byteLength: 4096
    });

    renderModal("spec.pdf");

    await waitFor(() => {
      expect(document.body.querySelector("iframe")?.getAttribute("src")).toBe("blob:preview");
    });
  });

  it("opens an SVG as the picture and switches to its source on request", async () => {
    const user = userEvent.setup();
    readImportedProjectFile.mockResolvedValue('<svg viewBox="0 0 8 8"><circle r="4" /></svg>');

    renderModal("logo.svg");

    // An SVG is its own source, so it comes over the text path, not as bytes.
    await waitFor(() => {
      expect(document.body.querySelector("img")?.getAttribute("alt")).toBe("logo.svg");
    });
    expect(readProjectAssetFile).not.toHaveBeenCalled();

    await user.click(screen.getByText("project_tree.preview_code"));

    expect(document.body.querySelector("img")).toBeNull();
    expect(document.body.textContent).toContain("circle");
  });

  it("still reads a code file as text, with no preview toggle", async () => {
    readImportedProjectFile.mockResolvedValue("export const answer = 42;");

    renderModal("index.ts");

    await waitFor(() => {
      expect(document.body.textContent).toContain("export const answer = 42;");
    });
    expect(document.body.querySelector("img")).toBeNull();
    expect(screen.queryByText("project_tree.preview_code")).toBeNull();
  });

  it("says why a file it cannot read has no preview", async () => {
    readProjectAssetFile.mockRejectedValue(
      new Error("Preview omitted. File is larger than 16 MB.")
    );

    renderModal("huge.png");

    await waitFor(() => {
      expect(document.body.textContent).toContain("larger than 16 MB");
    });
  });
});
