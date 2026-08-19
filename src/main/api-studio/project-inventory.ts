import fs from "node:fs/promises";
import path from "node:path";

import { detectProjectStack } from "../../brain/stack-detection/detect-stack";
import { readPackageJson } from "../../brain/stack-detection/package-json-reader";
import type { ProjectInventory } from "./types";

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".lazify",
  ".next",
  ".expo",
  ".turbo",
  ".venv",
  ".vs",
  "__pycache__",
  "bin",
  "build",
  "coverage",
  "dist",
  "dist-electron",
  "node_modules",
  "obj",
  "out",
  "release",
  "target",
  "vendor",
  "TestResults"
]);

const MAX_WALK_DEPTH = 10;
const MAX_WALK_FILES = 20000;

async function walkProjectFiles(projectPath: string) {
  const files: string[] = [];
  const queue: Array<{ absolutePath: string; depth: number }> = [{ absolutePath: projectPath, depth: 0 }];
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    let entries;

    try {
      entries = await fs.readdir(current.absolutePath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const absolutePath = path.join(current.absolutePath, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name) || current.depth >= MAX_WALK_DEPTH) continue;
        queue.push({ absolutePath, depth: current.depth + 1 });
        continue;
      }

      if (!entry.isFile()) continue;

      if (files.length >= MAX_WALK_FILES) {
        truncated = true;
        continue;
      }

      files.push(path.relative(projectPath, absolutePath).split(path.sep).join("/"));
    }
  }

  return { files: files.sort(), truncated };
}

const MANIFEST_NAMES = [
  "package.json",
  "composer.json",
  "requirements.txt",
  "pyproject.toml",
  "Pipfile",
  "setup.py"
];

const isManifest = (file: string) =>
  MANIFEST_NAMES.includes(file.slice(file.lastIndexOf("/") + 1)) ||
  /\.(csproj|fsproj)$/i.test(file);

/**
 * What each manifest declares, kept per file rather than as one blob: a
 * repository's root says nothing about what its `backend/` depends on.
 */
async function readManifests(projectPath: string, files: string[]) {
  const present = files.filter(isManifest).slice(0, 60);
  const contents = await Promise.all(
    present.map((manifest) =>
      fs
        .readFile(path.join(projectPath, manifest), "utf8")
        .then((text) => text.toLowerCase())
        .catch(() => "")
    )
  );

  return new Map(present.map((manifest, at) => [manifest, contents[at]]));
}

export async function createProjectInventory(projectPath: string): Promise<ProjectInventory> {
  const resolvedProjectPath = path.resolve(projectPath);
  const stats = await fs.stat(resolvedProjectPath).catch(() => null);

  if (!stats?.isDirectory()) {
    throw new Error("That project folder no longer exists.");
  }

  const [stack, packageJsonResult, walkResult] = await Promise.all([
    detectProjectStack(resolvedProjectPath),
    readPackageJson(resolvedProjectPath),
    walkProjectFiles(resolvedProjectPath)
  ]);

  const packageJson = packageJsonResult.packageJson;
  const manifests = await readManifests(resolvedProjectPath, walkResult.files);

  return {
    projectPath: resolvedProjectPath,
    stack,
    packageJson,
    files: walkResult.files,
    repositoryFiles: walkResult.files,
    filesTruncated: walkResult.truncated,
    hasDependency: (name: string) =>
      Boolean(packageJson?.dependencies?.[name] ?? packageJson?.devDependencies?.[name]) ||
      Array.from(manifests.values()).some((declared) => declared.includes(name.toLowerCase())),
    manifestOf: (relativePath: string) => manifests.get(relativePath) ?? "",
    readFile: async (relativePath: string) =>
      (await fs.readFile(path.join(resolvedProjectPath, relativePath), "utf8")).replace(/^\uFEFF/, "")
  };
}
