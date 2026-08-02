import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { replaceStarterNameToken, STARTER_NAME_TOKEN } from "../../src/main/starter-name-token";

let projectPath: string;

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-token-"));
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe("replaceStarterNameToken", () => {
  it("rewrites the starter's name wherever it appears", async () => {
    await fs.mkdir(path.join(projectPath, "src"), { recursive: true });
    await fs.writeFile(path.join(projectPath, "README.md"), `# ${STARTER_NAME_TOKEN}\n`);
    await fs.writeFile(
      path.join(projectPath, "src", "app.json"),
      JSON.stringify({ name: STARTER_NAME_TOKEN, slug: STARTER_NAME_TOKEN })
    );

    const changed = await replaceStarterNameToken(projectPath, "my-app");

    expect(changed.sort()).toEqual(["README.md", path.join("src", "app.json")]);
    expect(await fs.readFile(path.join(projectPath, "README.md"), "utf8")).toBe("# my-app\n");
    // Every occurrence in a file, not just the first.
    expect(JSON.parse(await fs.readFile(path.join(projectPath, "src", "app.json"), "utf8"))).toEqual({
      name: "my-app",
      slug: "my-app"
    });
  });

  it("leaves files without the token alone", async () => {
    await fs.writeFile(path.join(projectPath, "index.ts"), "export const x = 1;\n");

    await expect(replaceStarterNameToken(projectPath, "my-app")).resolves.toEqual([]);
    expect(await fs.readFile(path.join(projectPath, "index.ts"), "utf8")).toBe("export const x = 1;\n");
  });

  it("does not walk into directories that are not source", async () => {
    await fs.mkdir(path.join(projectPath, "node_modules", "dep"), { recursive: true });
    await fs.mkdir(path.join(projectPath, ".git"), { recursive: true });
    await fs.writeFile(path.join(projectPath, "node_modules", "dep", "index.js"), STARTER_NAME_TOKEN);
    await fs.writeFile(path.join(projectPath, ".git", "config"), STARTER_NAME_TOKEN);

    await expect(replaceStarterNameToken(projectPath, "my-app")).resolves.toEqual([]);
  });

  it("does not corrupt a binary file that happens to contain the token", async () => {
    // An icon or a font is not text; rewriting inside one would break it.
    const binary = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]),
      Buffer.from(STARTER_NAME_TOKEN)
    ]);
    await fs.writeFile(path.join(projectPath, "icon.png"), binary);

    await expect(replaceStarterNameToken(projectPath, "my-app")).resolves.toEqual([]);
    expect(await fs.readFile(path.join(projectPath, "icon.png"))).toEqual(binary);
  });
});
