import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

const userDataPath = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-response-file-")));
appFolders.data = userDataPath;

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

const { downloadDirectory, fileNameFor, isTextual, writeResponseFile } = await import(
  "@/shared/lib/api-studio/runner/response-file"
);

beforeEach(async () => {
  fs.rmSync(await downloadDirectory(), { recursive: true, force: true });
});

describe("a response that is a file", () => {
  it("knows what can be read as text and what cannot", async () => {
    expect(isTextual("application/json; charset=utf-8")).toBe(true);
    expect(isTextual("text/html")).toBe(true);
    expect(isTextual("image/svg+xml")).toBe(true);
    expect(isTextual(null)).toBe(true);
    expect(isTextual("application/pdf")).toBe(false);
    expect(isTextual("application/octet-stream")).toBe(false);
    expect(isTextual("image/png")).toBe(false);
  });

  it("takes the name the server gave it", async () => {
    expect(
      fileNameFor("http://localhost/certificate", "application/pdf", 'attachment; filename="policy.pdf"')
    ).toBe("policy.pdf");
    expect(
      fileNameFor("http://localhost/certificate", "application/pdf", "attachment; filename*=UTF-8''p%20one.pdf")
    ).toBe("p one.pdf");
  });

  it("falls back to the path it was asked for, with the type's extension", async () => {
    expect(fileNameFor("http://localhost/Partner/Certificate/Generate", "application/pdf", null)).toBe(
      "Generate.pdf"
    );
    expect(fileNameFor("http://localhost/report.csv", "text/csv", null)).toBe("report.csv");
    expect(fileNameFor("http://localhost/", "application/zip", null)).toBe("response.zip");
  });

  it("keeps the bytes beside the app, byte for byte", async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const kept = await writeResponseFile("policy.pdf", bytes);

    expect(kept.name).toBe("policy.pdf");
    expect(kept.path.startsWith(await downloadDirectory())).toBe(true);
    expect(new Uint8Array(fs.readFileSync(kept.path))).toEqual(bytes);
  });

  it("never lets one download stand on another", async () => {
    const first = await writeResponseFile("policy.pdf", new Uint8Array([1]));
    const second = await writeResponseFile("policy.pdf", new Uint8Array([2]));

    expect(first.path).not.toBe(second.path);
  });
});
