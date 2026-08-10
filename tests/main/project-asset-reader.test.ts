import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getProjectAssetMimeType,
  readProjectAssetFile,
} from "../../src/main/projects/project-asset-reader";

let projectPath: string;

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-asset-"));
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe("getProjectAssetMimeType", () => {
  it("names the type an asset previews as, whatever the extension's case", () => {
    expect(getProjectAssetMimeType("logo.PNG")).toBe("image/png");
    expect(getProjectAssetMimeType("photo.jpeg")).toBe("image/jpeg");
    expect(getProjectAssetMimeType("guide.pdf")).toBe("application/pdf");
    expect(getProjectAssetMimeType("icon.svg")).toBe("image/svg+xml");
  });

  it("returns null for files the editor reads as text", () => {
    expect(getProjectAssetMimeType("index.ts")).toBeNull();
    expect(getProjectAssetMimeType("Makefile")).toBeNull();
  });
});

describe("readProjectAssetFile", () => {
  it("hands the bytes over intact, where the text preview would refuse them", async () => {
    // A one-pixel PNG: its header carries the null bytes that trip the text
    // preview's binary check.
    const bytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const filePath = path.join(projectPath, "pixel.png");
    await fs.writeFile(filePath, bytes);

    const asset = await readProjectAssetFile(filePath);

    expect(asset.mimeType).toBe("image/png");
    expect(asset.byteLength).toBe(bytes.byteLength);
    expect(Buffer.from(asset.base64, "base64").equals(bytes)).toBe(true);
  });

  it("refuses a file that has no preview", async () => {
    const filePath = path.join(projectPath, "notes.txt");
    await fs.writeFile(filePath, "plain text");

    await expect(readProjectAssetFile(filePath)).rejects.toThrow(/no preview/i);
  });
});
