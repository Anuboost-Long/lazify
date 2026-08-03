import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readPackageJson } from "../../src/brain/stack-detection/package-json-reader";

describe("readPackageJson", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-package-json-"));
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it("reads a valid package.json", async () => {
    await fs.writeFile(
      path.join(projectPath, "package.json"),
      JSON.stringify({ scripts: { dev: "vite" }, dependencies: { react: "19.0.0" } })
    );

    await expect(readPackageJson(projectPath)).resolves.toEqual({
      packageJson: { scripts: { dev: "vite" }, dependencies: { react: "19.0.0" } },
      warnings: []
    });
  });

  it("distinguishes a missing package.json", async () => {
    await expect(readPackageJson(projectPath)).resolves.toEqual({
      packageJson: null,
      warnings: ["No package.json found."]
    });
  });

  it("reports malformed JSON without throwing", async () => {
    await fs.writeFile(path.join(projectPath, "package.json"), "{ broken");

    await expect(readPackageJson(projectPath)).resolves.toEqual({
      packageJson: null,
      warnings: ["Invalid package.json."]
    });
  });
});
