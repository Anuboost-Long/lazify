import { describe, expect, it } from "vitest";

import {
  formatByteSize,
  getFilePreviewKind,
  getRenderedPreviewKind,
  needsAssetBytes,
} from "../../src/renderer/shared/ui/code/preview/file-preview-kind";

describe("getFilePreviewKind", () => {
  it("sorts files into what the editor should do with them", () => {
    expect(getFilePreviewKind("hero.png")).toBe("image");
    expect(getFilePreviewKind("Shot.JPG")).toBe("image");
    expect(getFilePreviewKind("spec.pdf")).toBe("pdf");
    expect(getFilePreviewKind("logo.svg")).toBe("svg");
    expect(getFilePreviewKind("index.tsx")).toBe("text");
  });

  it("reads a file with no extension as text", () => {
    expect(getFilePreviewKind("Dockerfile")).toBe("text");
  });

  it("asks for bytes only where there is no text to show", () => {
    expect(needsAssetBytes("hero.png")).toBe(true);
    expect(needsAssetBytes("spec.pdf")).toBe(true);
    // An SVG is its own source, so the text read already has everything.
    expect(needsAssetBytes("logo.svg")).toBe(false);
    expect(needsAssetBytes("index.tsx")).toBe(false);
  });
});

describe("getRenderedPreviewKind", () => {
  it("renders an asset once its bytes have arrived, and not before", () => {
    expect(getRenderedPreviewKind("image", "preview", true)).toBe("image");
    expect(getRenderedPreviewKind("pdf", "preview", true)).toBe("pdf");
    // A surface that read the file as text has nothing to draw, so the caller
    // keeps the code view it always had.
    expect(getRenderedPreviewKind("image", "preview", false)).toBeNull();
  });

  it("lets the SVG toggle decide, with no bytes needed either way", () => {
    expect(getRenderedPreviewKind("svg", "preview", false)).toBe("svg");
    expect(getRenderedPreviewKind("svg", "code", false)).toBeNull();
  });

  it("never takes a text file off the code surface", () => {
    expect(getRenderedPreviewKind("text", "preview", true)).toBeNull();
  });
});

describe("formatByteSize", () => {
  it("scales the unit to the size", () => {
    expect(formatByteSize(512)).toBe("512 B");
    expect(formatByteSize(2048)).toBe("2 KB");
    expect(formatByteSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
