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

  return {
    projectPath: resolvedProjectPath,
    stack,
    packageJson,
    files: walkResult.files,
    filesTruncated: walkResult.truncated,
    hasDependency: (name: string) =>
      Boolean(packageJson?.dependencies?.[name] ?? packageJson?.devDependencies?.[name]),
    readFile: async (relativePath: string) =>
      (await fs.readFile(path.join(resolvedProjectPath, relativePath), "utf8")).replace(/^\uFEFF/, "")
  };
}
