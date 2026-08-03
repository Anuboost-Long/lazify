import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readStarterDescriptor } from "../../src/main/scaffolding/starter-descriptor";

let starterPath: string;

beforeEach(async () => {
  starterPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-descriptor-"));
});

afterEach(async () => {
  await fs.rm(starterPath, { recursive: true, force: true });
});

async function writeDescriptor(contents: string) {
  await fs.writeFile(path.join(starterPath, "starter.json"), contents);
}

describe("readStarterDescriptor", () => {
  it("defaults to empty when the starter declares nothing", async () => {
    // Neither existing starter repo has a starter.json yet, and both must scaffold.
    await expect(readStarterDescriptor(starterPath)).resolves.toEqual({
      substitutions: [],
      optionalFolders: [],
      required: [],
      excludeFromCopy: []
    });
  });

  it("reads a declared descriptor", async () => {
    await writeDescriptor(
      JSON.stringify({
        substitutions: [{ file: "package.json", jsonPath: "name", value: "{{projectName}}" }],
        optionalFolders: [{ path: "src/hooks", label: "hooks" }],
        required: ["package.json"],
        excludeFromCopy: [".github"]
      })
    );

    const descriptor = await readStarterDescriptor(starterPath);

    expect(descriptor.substitutions).toHaveLength(1);
    expect(descriptor.optionalFolders).toEqual([{ path: "src/hooks", label: "hooks" }]);
    expect(descriptor.required).toEqual(["package.json"]);
    expect(descriptor.excludeFromCopy).toEqual([".github"]);
  });

  it("falls back to defaults when the descriptor is malformed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await writeDescriptor("{ not json");

    // A stray comma in an optional file must not block project creation.
    const descriptor = await readStarterDescriptor(starterPath);

    expect(descriptor).toEqual({
      substitutions: [],
      optionalFolders: [],
      required: [],
      excludeFromCopy: []
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("drops entries that could not do anything", async () => {
    await writeDescriptor(
      JSON.stringify({
        substitutions: [
          { file: "package.json", value: "x" }, // neither token nor jsonPath
          { file: "readme.md", token: "__NAME__", value: "x" }
        ],
        optionalFolders: [{ path: "src/hooks" }, { path: "src/api", label: "api" }],
        required: ["package.json", 7]
      })
    );

    const descriptor = await readStarterDescriptor(starterPath);

    expect(descriptor.substitutions).toEqual([
      { file: "readme.md", token: "__NAME__", value: "x" }
    ]);
    expect(descriptor.optionalFolders).toEqual([{ path: "src/api", label: "api" }]);
    expect(descriptor.required).toEqual(["package.json"]);
  });
});
