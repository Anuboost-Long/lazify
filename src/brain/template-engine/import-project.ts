import fs from "node:fs/promises";
import path from "node:path";

import { MAX_TEMPLATE_CONTENT_BYTES, SAFE_TEXT_EXTENSIONS } from "../resources/content-rules";
import {
  DEFAULT_IGNORED_DIRECTORY_NAMES,
  DEFAULT_IGNORED_FILE_NAMES,
  ENVIRONMENT_FILE_NAMES,
} from "../resources/import-rules";
import { detectFileRole } from "./detect-file-role";
import { detectFolderRole } from "./detect-folder-role";
import type { TreeNode } from "./types";

interface IgnoreRule {
  negated: boolean;
  directoryOnly: boolean;
  basenameOnly: boolean;
  matcher: RegExp;
}

export interface ImportProjectResult {
  tree: TreeNode[];
  warnings: string[];
  originalFileCount: number;
}

function sortDirectoryEntries(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function normalizeRelativePath(value: string) {
  return value.split(path.sep).join("/");
}

function escapeRegex(value: string) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(pattern: string) {
  let regex = "";

  for (let index = 0; index < pattern.length; index += 1) {
    const current = pattern[index];
    const next = pattern[index + 1];

    if (current === "*") {
      if (next === "*") {
        const nextNext = pattern[index + 2];

        if (nextNext === "/") {
          regex += "(?:.*/)?";
          index += 2;
        } else {
          regex += ".*";
          index += 1;
        }
      } else {
        regex += "[^/]*";
      }

      continue;
    }

    if (current === "?") {
      regex += "[^/]";
      continue;
    }

    regex += escapeRegex(current);
  }

  return regex;
}

function compileIgnoreRule(rawPattern: string, baseRelativePath: string): IgnoreRule | null {
  const trimmedPattern = rawPattern.trim();

  if (!trimmedPattern || trimmedPattern.startsWith("#")) {
    return null;
  }

  const negated = trimmedPattern.startsWith("!");
  let pattern = negated ? trimmedPattern.slice(1) : trimmedPattern;

  if (!pattern) {
    return null;
  }

  const directoryOnly = pattern.endsWith("/");

  if (directoryOnly) {
    pattern = pattern.slice(0, -1);
  }

  const anchored = pattern.startsWith("/");

  if (anchored) {
    pattern = pattern.slice(1);
  }

  if (!pattern) {
    return null;
  }

  const basenameOnly = !pattern.includes("/");
  const scopedPattern = basenameOnly ? pattern : baseRelativePath ? `${baseRelativePath}/${pattern}` : pattern;

  return {
    negated,
    directoryOnly,
    basenameOnly,
    matcher: new RegExp(`^${globToRegex(scopedPattern)}$`),
  };
}

async function loadIgnoreRules(currentPath: string, baseRelativePath: string) {
  const gitignorePath = path.join(currentPath, ".gitignore");

  try {
    const content = await fs.readFile(gitignorePath, "utf8");
    return content
      .split(/\r?\n/)
      .map((line) => compileIgnoreRule(line, baseRelativePath))
      .filter((rule): rule is IgnoreRule => rule !== null);
  } catch {
    return [];
  }
}

function shouldIgnore(relativePath: string, entryName: string, isDirectory: boolean, rules: IgnoreRule[]) {
  let ignored = false;

  for (const rule of rules) {
    if (rule.directoryOnly && !isDirectory) {
      continue;
    }

    const target = rule.basenameOnly ? entryName : relativePath;

    if (!rule.matcher.test(target)) {
      continue;
    }

    ignored = !rule.negated;
  }

  return ignored;
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

async function readTemplateFileContent(filePath: string, size: number) {
  const extension = path.extname(filePath).toLowerCase();

  if (size > MAX_TEMPLATE_CONTENT_BYTES) {
    return {
      includeContent: false,
      content: undefined,
      isBinary: false,
    };
  }

  const buffer = await fs.readFile(filePath);

  if (isLikelyBinary(buffer) || !SAFE_TEXT_EXTENSIONS.has(extension)) {
    return {
      includeContent: false,
      content: undefined,
      isBinary: true,
    };
  }

  return {
    includeContent: true,
    content: buffer.toString("utf8"),
    isBinary: false,
  };
}

async function scanDirectoryNode(input: {
  rootPath: string;
  currentPath: string;
  selectedRelativePaths?: Set<string>;
  inheritedRules?: IgnoreRule[];
  warnings: Set<string>;
  counters: { files: number };
}): Promise<TreeNode[]> {
  const baseRelativePath = normalizeRelativePath(path.relative(input.rootPath, input.currentPath));
  const localRules = await loadIgnoreRules(input.currentPath, baseRelativePath);
  const activeRules = [...(input.inheritedRules ?? []), ...localRules];
  const directoryEntries = await fs.readdir(input.currentPath, { withFileTypes: true });
  const visibleEntries = directoryEntries
    .filter((entry) => {
      const entryPath = path.join(input.currentPath, entry.name);
      const relativePath = normalizeRelativePath(path.relative(input.rootPath, entryPath));

      if (entry.name === ".git") {
        return false;
      }

      if (entry.isDirectory() && DEFAULT_IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        return false;
      }

      if (entry.isFile() && DEFAULT_IGNORED_FILE_NAMES.has(entry.name)) {
        if (ENVIRONMENT_FILE_NAMES.has(entry.name)) {
          input.warnings.add("Environment files were excluded for safety.");
        }
        return false;
      }

      if (shouldIgnore(relativePath, entry.name, entry.isDirectory(), activeRules)) {
        return false;
      }

      if (!input.selectedRelativePaths) {
        return true;
      }

      if (entry.isDirectory()) {
        return Array.from(input.selectedRelativePaths).some(
          (selectedPath) => selectedPath === relativePath || selectedPath.startsWith(`${relativePath}/`)
        );
      }

      return input.selectedRelativePaths.has(relativePath);
    })
    .sort((left, right) => {
      if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
      }

      return sortDirectoryEntries(left.name, right.name);
    });

  const nodes = await Promise.all(
    visibleEntries.map(async (entry) => {
      const entryPath = path.join(input.currentPath, entry.name);
      const relativePath = normalizeRelativePath(path.relative(input.rootPath, entryPath));

      if (entry.isDirectory()) {
        const children = await scanDirectoryNode({
          ...input,
          currentPath: entryPath,
          inheritedRules: activeRules,
        });

        if (children.length === 0 && input.selectedRelativePaths) {
          return null;
        }

        return {
          id: `tree-${relativePath || entry.name}`,
          name: entry.name,
          path: relativePath,
          type: "folder" as const,
          role: detectFolderRole(relativePath),
          locked: false,
          source: "imported" as const,
          children,
        };
      }

      if (!entry.isFile()) {
        return null;
      }

      input.counters.files += 1;
      const stats = await fs.stat(entryPath);
      const contentResult = await readTemplateFileContent(entryPath, stats.size);

      if (!contentResult.includeContent && stats.size > MAX_TEMPLATE_CONTENT_BYTES) {
        input.warnings.add("Some large files were skipped from content storage.");
      }

      if (contentResult.isBinary) {
        input.warnings.add("Binary files were stored as references only.");
      }

      return {
        id: `tree-${relativePath || entry.name}`,
        name: entry.name,
        path: relativePath,
        type: "file" as const,
        extension: path.extname(entry.name).toLowerCase(),
        size: stats.size,
        role: detectFileRole(relativePath),
        includeContent: contentResult.includeContent,
        content: contentResult.content,
        isBinary: contentResult.isBinary,
        locked: false,
        source: "imported" as const,
      };
    })
  );

  return nodes.filter((node): node is NonNullable<typeof node> => node !== null);
}

async function countVisibleFiles(input: {
  rootPath: string;
  currentPath: string;
  inheritedRules?: IgnoreRule[];
  warnings: Set<string>;
}): Promise<number> {
  const baseRelativePath = normalizeRelativePath(path.relative(input.rootPath, input.currentPath));
  const localRules = await loadIgnoreRules(input.currentPath, baseRelativePath);
  const activeRules = [...(input.inheritedRules ?? []), ...localRules];
  const directoryEntries = await fs.readdir(input.currentPath, { withFileTypes: true });
  let count = 0;

  for (const entry of directoryEntries) {
    const entryPath = path.join(input.currentPath, entry.name);
    const relativePath = normalizeRelativePath(path.relative(input.rootPath, entryPath));

    if (entry.name === ".git") {
      continue;
    }

    if (entry.isDirectory() && DEFAULT_IGNORED_DIRECTORY_NAMES.has(entry.name)) {
      continue;
    }

    if (entry.isFile() && DEFAULT_IGNORED_FILE_NAMES.has(entry.name)) {
      if (ENVIRONMENT_FILE_NAMES.has(entry.name)) {
        input.warnings.add("Environment files were excluded for safety.");
      }
      continue;
    }

    if (shouldIgnore(relativePath, entry.name, entry.isDirectory(), activeRules)) {
      continue;
    }

    if (entry.isDirectory()) {
      count += await countVisibleFiles({
        ...input,
        currentPath: entryPath,
        inheritedRules: activeRules,
      });
      continue;
    }

    if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

export async function importProject(projectRoot: string): Promise<TreeNode[]> {
  const result = await importProjectWithMetadata(projectRoot);
  return result.tree;
}

export async function importProjectWithMetadata(
  projectRoot: string,
  selectedRelativePaths?: string[]
): Promise<ImportProjectResult> {
  const resolvedProjectPath = path.resolve(projectRoot);
  const stats = await fs.stat(resolvedProjectPath);

  if (!stats.isDirectory()) {
    throw new Error("The selected path is not a directory.");
  }

  const warnings = new Set<string>();
  const counters = { files: 0 };
  const selectedSet = selectedRelativePaths
    ? new Set(selectedRelativePaths.map((entry) => normalizeRelativePath(path.normalize(entry))))
    : undefined;
  const originalFileCount = await countVisibleFiles({
    rootPath: resolvedProjectPath,
    currentPath: resolvedProjectPath,
    warnings
  });
  const tree = await scanDirectoryNode({
    rootPath: resolvedProjectPath,
    currentPath: resolvedProjectPath,
    selectedRelativePaths: selectedSet,
    warnings,
    counters,
  });

  return {
    tree,
    warnings: [...warnings],
    originalFileCount,
  };
}
