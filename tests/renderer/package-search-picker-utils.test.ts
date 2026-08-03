import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getFallbackPackageOption,
  parsePackageNames,
  resolveTemplatePackagePreviews
} from "../../src/renderer/features/init/components/PackageSearchPicker/utils";

afterEach(() => {
  Reflect.deleteProperty(globalThis, "lazify");
});

describe("parsePackageNames", () => {
  it("trims comma-separated names and removes empty entries", () => {
    expect(parsePackageNames(" react, , clsx,\n zod ")).toEqual(["react", "clsx", "zod"]);
  });
});

describe("getFallbackPackageOption", () => {
  it("keeps the requested package name when registry metadata is unavailable", () => {
    expect(getFallbackPackageOption("react")).toEqual({
      name: "react",
      version: "",
      description: "",
      keywords: [],
      publisher: null
    });
  });
});

describe("resolveTemplatePackagePreviews", () => {
  it("uses the exact registry match and preserves the requested version", async () => {
    const searchNpmPackages = vi.fn().mockResolvedValue([
      {
        name: "react-other",
        version: "1.0.0",
        description: "Wrong package",
        keywords: [],
        publisher: null
      },
      {
        name: "react",
        version: "19.0.0",
        description: "React",
        keywords: ["ui"],
        publisher: "npm"
      }
    ]);
    Object.defineProperty(globalThis, "lazify", {
      configurable: true,
      value: { searchNpmPackages }
    });

    await expect(
      resolveTemplatePackagePreviews([{ name: "react", version: "^18.0.0" }])
    ).resolves.toEqual([
      {
        name: "react",
        version: "19.0.0",
        description: "React",
        keywords: ["ui"],
        publisher: "npm",
        requestedVersion: "^18.0.0"
      }
    ]);
  });

  it("returns a useful fallback when registry lookup fails", async () => {
    Object.defineProperty(globalThis, "lazify", {
      configurable: true,
      value: { searchNpmPackages: vi.fn().mockRejectedValue(new Error("offline")) }
    });

    const [preview] = await resolveTemplatePackagePreviews([
      { name: "jotai", version: "^2.0.0" }
    ]);

    expect(preview.name).toBe("jotai");
    expect(preview.requestedVersion).toBe("^2.0.0");
    expect(preview.description).toContain("metadata is unavailable");
  });
});
