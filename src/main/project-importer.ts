import fs from "node:fs/promises";
import path from "node:path";

import { detectProjectStack } from "../brain";
import type { ImportedProjectScanResult, ProjectTreeNode } from "../renderer/shared/types/lazify";

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".expo",
  ".turbo",
  "coverage"
]);
const MAX_PREVIEW_BYTES = 256 * 1024;

function sortDirectoryEntries(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function createNode(
  relativePath: string,
  name: string,
  type: "file" | "folder",
  children: ProjectTreeNode[] = [],
  content?: string
): ProjectTreeNode {
  return {
    id: `imported-${relativePath || name}`,
    name,
    type,
    source: "custom",
    locked: false,
    content,
    children
  };
}

function getPreviewPlaceholder(message: string) {
  return `${message}\n`;
}

function isLikelyBinary(buffer: Buffer) {
  const sampleSize = Math.min(buffer.length, 8000);

  for (let index = 0; index < sampleSize; index += 1) {
    if (buffer[index] === 0) {
      return true;
    }
  }

  return false;
}

async function readFilePreview(filePath: string) {
  const stats = await fs.stat(filePath);

  if (stats.size > MAX_PREVIEW_BYTES) {
    return getPreviewPlaceholder(
      `Preview omitted. File is larger than ${Math.round(MAX_PREVIEW_BYTES / 1024)} KB.`
    );
  }

  const buffer = await fs.readFile(filePath);

  if (isLikelyBinary(buffer)) {
    return getPreviewPlaceholder("Preview unavailable for binary file.");
  }

  return buffer.toString("utf8");
}

async function scanDirectoryNode(rootPath: string, currentPath: string): Promise<ProjectTreeNode[]> {
  const directoryEntries = await fs.readdir(currentPath, { withFileTypes: true });
  const visibleEntries = directoryEntries
    .filter((entry) => {
      if (entry.isDirectory()) {
        return !IGNORED_DIRECTORY_NAMES.has(entry.name);
      }

      return true;
    })
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }

      return sortDirectoryEntries(left.name, right.name);
    });

  const nodes = await Promise.all(
    visibleEntries.map(async (entry) => {
      const entryPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, entryPath).split(path.sep).join("/");

      if (entry.isDirectory()) {
        const children = await scanDirectoryNode(rootPath, entryPath);
        return createNode(relativePath, entry.name, "folder", children);
      }

      if (!entry.isFile()) {
        return null;
      }

      const content = await readFilePreview(entryPath);
      return createNode(relativePath, entry.name, "file", [], content);
    })
  );

  return nodes.filter((node): node is ProjectTreeNode => node !== null);
}

export async function importProjectFromDirectory(projectPath: string): Promise<ImportedProjectScanResult> {
  const resolvedProjectPath = path.resolve(projectPath);
  const stats = await fs.stat(resolvedProjectPath);

  if (!stats.isDirectory()) {
    throw new Error("The selected path is not a directory.");
  }

  return {
    projectName: path.basename(resolvedProjectPath),
    projectPath: resolvedProjectPath,
    stackDetection: await detectProjectStack(resolvedProjectPath),
    tree: await scanDirectoryNode(resolvedProjectPath, resolvedProjectPath)
  };
}
