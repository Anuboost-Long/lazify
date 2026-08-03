import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applySubstitutions,
  classifyCloneFailure,
  provisionStarter,
  StarterError
} from "../../src/main/scaffolding/starter-provisioner";
import type { StarterDescriptor } from "../../src/main/scaffolding/starter-descriptor";

const execFileAsync = promisify(execFile);

function descriptor(overrides: Partial<StarterDescriptor> = {}): StarterDescriptor {
  return { substitutions: [], optionalFolders: [], required: [], excludeFromCopy: [], ...overrides };
}

describe("classifyCloneFailure", () => {
  it("recognises being offline", () => {
    // The one case the UI has to name precisely, since the fix is the user's.
    expect(classifyCloneFailure("fatal: unable to access ...: Could not resolve host: github.com")).toBe(
      "offline"
    );
    expect(classifyCloneFailure("ssh: connect to host github.com port 22: Operation timed out")).toBe(
      "offline"
    );
  });

  it("recognises a starter that is not there", () => {
    expect(classifyCloneFailure("remote: Repository not found.")).toBe("unreachable");
    expect(classifyCloneFailure("fatal: Remote branch v9.9.9 not found in upstream origin")).toBe(
      "unreachable"
    );
  });

  it("falls back rather than guessing", () => {
    expect(classifyCloneFailure("fatal: destination path already exists")).toBe("clone-failed");
  });
});

describe("applySubstitutions", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-subs-"));
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it("sets a JSON key and expands the project name", async () => {
    await fs.writeFile(path.join(projectPath, "package.json"), JSON.stringify({ name: "starter" }));

    await applySubstitutions(
      projectPath,
      descriptor({
        substitutions: [{ file: "package.json", jsonPath: "name", value: "{{projectName}}" }]
      }),
      "my-app"
    );

    const written = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf8"));
    expect(written.name).toBe("my-app");
  });

  it("creates nested JSON keys that are not there yet", async () => {
    await fs.writeFile(path.join(projectPath, "app.json"), JSON.stringify({}));

    await applySubstitutions(
      projectPath,
      descriptor({ substitutions: [{ file: "app.json", jsonPath: "expo.name", value: "{{projectName}}" }] }),
      "my-app"
    );

    const written = JSON.parse(await fs.readFile(path.join(projectPath, "app.json"), "utf8"));
    expect(written).toEqual({ expo: { name: "my-app" } });
  });

  it("replaces every occurrence of a token", async () => {
    await fs.writeFile(path.join(projectPath, "layout.tsx"), "<title>__APP_TITLE__</title>__APP_TITLE__");

    await applySubstitutions(
      projectPath,
      descriptor({
        substitutions: [{ file: "layout.tsx", token: "__APP_TITLE__", value: "{{projectName}}" }]
      }),
      "my-app"
    );

    expect(await fs.readFile(path.join(projectPath, "layout.tsx"), "utf8")).toBe(
      "<title>my-app</title>my-app"
    );
  });

  it("renames the package even when the starter declares nothing", async () => {
    await fs.writeFile(
      path.join(projectPath, "package.json"),
      JSON.stringify({ name: "next-scaffold", version: "0.1.0" })
    );

    // Even when a descriptor declares nothing, a user who typed "my-app" must
    // not end up with a project named after the starter repo.
    await applySubstitutions(projectPath, descriptor(), "my-app");

    const written = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf8"));
    expect(written).toEqual({ name: "my-app", version: "0.1.0" });
  });

  it("lets a starter override the package name it declares itself", async () => {
    await fs.writeFile(path.join(projectPath, "package.json"), JSON.stringify({ name: "starter" }));

    await applySubstitutions(
      projectPath,
      descriptor({
        substitutions: [{ file: "package.json", jsonPath: "name", value: "{{projectName}}-web" }]
      }),
      "my-app"
    );

    const written = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf8"));
    expect(written.name).toBe("my-app-web");
  });

  it("skips a declared file the starter no longer ships", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // The starter's own CI is where this gets caught; refusing to create the
    // project would be the worse trade.
    await expect(
      applySubstitutions(
        projectPath,
        descriptor({ substitutions: [{ file: "gone.tsx", token: "__X__", value: "y" }] }),
        "my-app"
      )
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("refuses to write outside the project", async () => {
    await expect(
      applySubstitutions(
        projectPath,
        descriptor({ substitutions: [{ file: "../escaped.txt", token: "__X__", value: "y" }] }),
        "my-app"
      )
    ).rejects.toBeInstanceOf(StarterError);
  });
});

describe("provisionStarter", () => {
  let workspace: string;
  let gitConfig: string;

  // A real starter repo on disk, cloned over a real git transport. `insteadOf`
  // redirects the GitHub URL locally, so the clone under test is the production
  // one — no network, and no seam added to the code just to be testable.
  beforeAll(async () => {
    workspace = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-starter-"));
    const originPath = path.join(workspace, "origin");

    await fs.mkdir(path.join(originPath, ".github"), { recursive: true });
    await fs.writeFile(path.join(originPath, "package.json"), JSON.stringify({ name: "starter" }, null, 2));
    await fs.writeFile(path.join(originPath, "layout.tsx"), "<title>__APP_TITLE__</title>");
    await fs.writeFile(path.join(originPath, ".github", "ci.yml"), "on: push");
    await fs.writeFile(
      path.join(originPath, "starter.json"),
      JSON.stringify({
        substitutions: [
          { file: "package.json", jsonPath: "name", value: "{{projectName}}" },
          { file: "layout.tsx", token: "__APP_TITLE__", value: "{{projectName}}" }
        ],
        required: ["package.json"],
        excludeFromCopy: [".github"]
      })
    );

    const git = (args: string[]) => execFileAsync("git", args, { cwd: originPath });
    await git(["init", "--quiet", "--initial-branch=main"]);
    await git(["config", "user.email", "test@example.com"]);
    await git(["config", "user.name", "Test"]);
    await git(["add", "-A"]);
    await git(["commit", "--quiet", "-m", "starter"]);
    await git(["tag", "v1.0.0"]);

    gitConfig = path.join(workspace, "gitconfig");
    await fs.writeFile(
      gitConfig,
      `[url "${originPath}"]\n\tinsteadOf = https://github.com/acme/starter.git\n`
    );
    process.env.GIT_CONFIG_GLOBAL = gitConfig;
    process.env.GIT_CONFIG_NOSYSTEM = "1";
  });

  afterAll(async () => {
    delete process.env.GIT_CONFIG_GLOBAL;
    delete process.env.GIT_CONFIG_NOSYSTEM;
    await fs.rm(workspace, { recursive: true, force: true });
  });

  it("clones the tag and makes the tree the user's own", async () => {
    const projectPath = path.join(workspace, "my-app");

    const result = await provisionStarter({
      repo: "acme/starter",
      ref: "v1.0.0",
      projectPath,
      projectName: "my-app"
    });

    // The starter's history is not the user's history.
    await expect(fs.stat(path.join(projectPath, ".git"))).rejects.toThrow();
    // Its own scaffolding is not part of their app.
    await expect(fs.stat(path.join(projectPath, "starter.json"))).rejects.toThrow();
    await expect(fs.stat(path.join(projectPath, ".github"))).rejects.toThrow();

    const pkg = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf8"));
    expect(pkg.name).toBe("my-app");
    expect(await fs.readFile(path.join(projectPath, "layout.tsx"), "utf8")).toBe("<title>my-app</title>");

    // The descriptor is returned so the picker knows what may not be removed.
    expect(result.required).toEqual(["package.json"]);
  });

  it("reports a missing tag as unreachable rather than as a generic failure", async () => {
    const error = await provisionStarter({
      repo: "acme/starter",
      ref: "v9.9.9",
      projectPath: path.join(workspace, "missing-tag"),
      projectName: "missing-tag"
    }).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(StarterError);
    expect((error as StarterError).reason).toBe("unreachable");
  });
});
