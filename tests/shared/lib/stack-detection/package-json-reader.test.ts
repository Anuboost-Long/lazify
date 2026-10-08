import { describe, expect, it } from "vitest";

import { readPackageJson } from "@/shared/lib/stack-detection/package-json-reader";

import { memoryReader } from "./memory-reader";

describe("readPackageJson", () => {
  it("reads a valid package.json", async () => {
    const project = memoryReader({
      "package.json": JSON.stringify({ scripts: { dev: "vite" }, dependencies: { react: "19.0.0" } })
    });

    await expect(readPackageJson(project)).resolves.toEqual({
      packageJson: { scripts: { dev: "vite" }, dependencies: { react: "19.0.0" } },
      warnings: []
    });
  });

  it("distinguishes a missing package.json", async () => {
    await expect(readPackageJson(memoryReader({}))).resolves.toEqual({
      packageJson: null,
      warnings: ["No package.json found."]
    });
  });

  it("reports malformed JSON without throwing", async () => {
    await expect(readPackageJson(memoryReader({ "package.json": "{ broken" }))).resolves.toEqual({
      packageJson: null,
      warnings: ["Invalid package.json."]
    });
  });

  it("reports an unreadable package.json as invalid", async () => {
    await expect(readPackageJson(memoryReader({ "package.json/": "" }))).resolves.toEqual({
      packageJson: null,
      warnings: ["Invalid package.json."]
    });
  });
});
