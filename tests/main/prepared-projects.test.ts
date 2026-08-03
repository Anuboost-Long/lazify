import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  forgetPreparedProject,
  getPreparedProject,
  materializePreparedProject,
  rememberPreparedProject,
  type PreparedProject
} from "../../src/main/scaffolding/prepared-projects";

describe("materializePreparedProject", () => {
  let testRoot: string | undefined;

  afterEach(async () => {
    if (testRoot) {
      await fs.rm(testRoot, { recursive: true, force: true });
    }
  });

  it("keeps the destination absent until the reviewed tree is materialized", async () => {
    testRoot = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-prepared-"));
    const stagingRoot = path.join(testRoot, "staging");
    const projectPath = path.join(stagingRoot, "my-app");
    const destinationPath = path.join(testRoot, "workspace", "my-app");

    await fs.mkdir(projectPath, { recursive: true });
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(path.join(projectPath, "package.json"), '{"name":"my-app"}');

    const prepared: PreparedProject = {
      projectPath,
      destinationPath,
      stagingRoot,
      templateId: "test",
      optionalFolders: [],
      required: []
    };

    await expect(fs.stat(destinationPath)).rejects.toThrow();

    await materializePreparedProject(prepared);

    expect(await fs.readFile(path.join(destinationPath, "package.json"), "utf8")).toBe(
      '{"name":"my-app"}'
    );
    await expect(fs.stat(stagingRoot)).rejects.toThrow();
  });
});

describe("prepared project registry", () => {
  const prepared: PreparedProject = {
    projectPath: "/tmp/lazify-staged/test-project",
    destinationPath: "/workspace/test-project",
    stagingRoot: "/tmp/lazify-staged",
    templateId: "test",
    optionalFolders: [],
    required: []
  };

  afterEach(() => {
    forgetPreparedProject(prepared.projectPath);
  });

  it("remembers the full staged-project metadata", () => {
    rememberPreparedProject(prepared);

    expect(getPreparedProject(prepared.projectPath)).toBe(prepared);
  });

  it("forgets a project after finalization or discard", () => {
    rememberPreparedProject(prepared);
    forgetPreparedProject(prepared.projectPath);

    expect(getPreparedProject(prepared.projectPath)).toBeUndefined();
  });
});
