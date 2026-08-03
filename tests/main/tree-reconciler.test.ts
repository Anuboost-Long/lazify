import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { reconcileProjectStructure } from "../../src/main/scaffolding/tree-reconciler";
import type { ProjectTreeNode } from "../../src/renderer/shared/types/lazify";

function file(name: string, content = ""): ProjectTreeNode {
  return { id: name, name, type: "file", source: "custom", locked: false, content, children: [] };
}

function folder(name: string, children: ProjectTreeNode[]): ProjectTreeNode {
  return { id: name, name, type: "folder", source: "custom", locked: false, children };
}

describe("reconcileProjectStructure", () => {
  let projectPath: string;

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-reconcile-"));
  });

  afterEach(async () => {
    await fs.rm(projectPath, { recursive: true, force: true });
  });

  it("writes nested folders and file contents", async () => {
    reconcileProjectStructure(projectPath, [folder("src", [folder("app", [file("page.tsx", "page")])])]);

    expect(await fs.readFile(path.join(projectPath, "src", "app", "page.tsx"), "utf8")).toBe(
      "page"
    );
  });

  it("replaces known scaffold roots instead of leaving stale files", async () => {
    await fs.mkdir(path.join(projectPath, "components"));
    await fs.writeFile(path.join(projectPath, "components", "stale.tsx"), "stale");

    reconcileProjectStructure(projectPath, [folder("components", [file("Button.tsx", "button")])]);

    await expect(fs.stat(path.join(projectPath, "components", "stale.tsx"))).rejects.toThrow();
    expect(await fs.readFile(path.join(projectPath, "components", "Button.tsx"), "utf8")).toBe(
      "button"
    );
  });

  it("preserves files in roots that are not marked replaceable", async () => {
    await fs.mkdir(path.join(projectPath, "docs"));
    await fs.writeFile(path.join(projectPath, "docs", "existing.md"), "existing");

    reconcileProjectStructure(projectPath, [folder("docs", [file("new.md", "new")])]);

    expect(await fs.readFile(path.join(projectPath, "docs", "existing.md"), "utf8")).toBe(
      "existing"
    );
    expect(await fs.readFile(path.join(projectPath, "docs", "new.md"), "utf8")).toBe("new");
  });

  it("merges package scripts and dependencies without replacing existing values", async () => {
    await fs.writeFile(
      path.join(projectPath, "package.json"),
      JSON.stringify({
        name: "existing-app",
        scripts: { dev: "vite" },
        dependencies: { react: "19.0.0" }
      })
    );

    reconcileProjectStructure(projectPath, [
      file(
        "package.json",
        JSON.stringify({
          name: "template-app",
          scripts: { dev: "template-dev", test: "vitest" },
          dependencies: { react: "18.0.0", clsx: "2.1.1" }
        })
      )
    ]);

    const packageJson = JSON.parse(await fs.readFile(path.join(projectPath, "package.json"), "utf8"));
    expect(packageJson.name).toBe("existing-app");
    expect(packageJson.scripts).toEqual({ dev: "vite", test: "vitest" });
    expect(packageJson.dependencies).toEqual({ react: "19.0.0", clsx: "2.1.1" });
  });
});
