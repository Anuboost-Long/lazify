import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-response-file-"));

vi.mock("electron", () => ({ app: { getPath: () => userDataPath } }));

const { downloadDirectory, fileNameFor, isTextual, writeResponseFile } = await import(
  "../../../src/main/api-studio/runner/response-file"
);

beforeEach(() => {
  fs.rmSync(downloadDirectory(), { recursive: true, force: true });
});

describe("a response that is a file", () => {
  it("knows what can be read as text and what cannot", () => {
    expect(isTextual("application/json; charset=utf-8")).toBe(true);
    expect(isTextual("text/html")).toBe(true);
    expect(isTextual("image/svg+xml")).toBe(true);
    expect(isTextual(null)).toBe(true);
    expect(isTextual("application/pdf")).toBe(false);
    expect(isTextual("application/octet-stream")).toBe(false);
    expect(isTextual("image/png")).toBe(false);
  });

  it("takes the name the server gave it", () => {
    expect(
      fileNameFor("http://localhost/certificate", "application/pdf", 'attachment; filename="policy.pdf"')
    ).toBe("policy.pdf");
    expect(
      fileNameFor("http://localhost/certificate", "application/pdf", "attachment; filename*=UTF-8''p%20one.pdf")
    ).toBe("p one.pdf");
  });

  it("falls back to the path it was asked for, with the type's extension", () => {
    expect(fileNameFor("http://localhost/Partner/Certificate/Generate", "application/pdf", null)).toBe(
      "Generate.pdf"
    );
    expect(fileNameFor("http://localhost/report.csv", "text/csv", null)).toBe("report.csv");
    expect(fileNameFor("http://localhost/", "application/zip", null)).toBe("response.zip");
  });

  it("keeps the bytes beside the app, byte for byte", () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const kept = writeResponseFile("policy.pdf", bytes);

    expect(kept.name).toBe("policy.pdf");
    expect(kept.path.startsWith(downloadDirectory())).toBe(true);
    expect(new Uint8Array(fs.readFileSync(kept.path))).toEqual(bytes);
  });

  it("never lets one download stand on another", () => {
    const first = writeResponseFile("policy.pdf", new Uint8Array([1]));
    const second = writeResponseFile("policy.pdf", new Uint8Array([2]));

    expect(first.path).not.toBe(second.path);
  });
});
