import fs from "node:fs/promises";
import path from "node:path";

import type {
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ProjectTreeNode,
} from "../renderer/shared/types/lazify";
import { createImportedProjectTemplate } from "./project-importer-optimized";

const IMPORTED_TEMPLATE_DIRECTORY = path.resolve(process.cwd(), "templates/imported");

function slug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureDirectory() {
  await fs.mkdir(IMPORTED_TEMPLATE_DIRECTORY, { recursive: true });
}

async function readTemplateFile(filePath: string) {
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as ImportedTemplateSnapshot;
}

function toOption(template: ImportedTemplateSnapshot): ImportedTemplateOption {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    sourceProjectPath: template.sourceProjectPath,
    savedAt: template.savedAt,
    fileCount: template.fileCount,
  };
}

function countFiles(tree: ProjectTreeNode[]): number {
  return tree.reduce((total, node) => {
    if (node.type === "file") {
      return total + 1;
    }

    return total + countFiles(node.children);
  }, 0);
}

async function getTemplateFilePath(id: string) {
  await ensureDirectory();
  return path.join(IMPORTED_TEMPLATE_DIRECTORY, `${id}.json`);
}

async function resolveDefaultTemplateName() {
  const templates = await listImportedTemplates();
  const prefix = "laz-temp-";
  const nextIndex =
    templates
      .map((template) => {
        if (!template.name.startsWith(prefix)) {
          return 0;
        }

        const suffix = Number.parseInt(template.name.slice(prefix.length), 10);
        return Number.isFinite(suffix) ? suffix : 0;
      })
      .reduce((highest, current) => Math.max(highest, current), 0) + 1;

  return `${prefix}${String(nextIndex).padStart(3, "0")}`;
}

async function resolveUniqueId(baseName: string) {
  const baseSlug = slug(baseName) || "laz-template";
  const templates = await listImportedTemplates();
  const takenIds = new Set(templates.map((template) => template.id));

  if (!takenIds.has(baseSlug)) {
    return baseSlug;
  }

  let index = 2;

  while (takenIds.has(`${baseSlug}-${String(index)}`)) {
    index += 1;
  }

  return `${baseSlug}-${String(index)}`;
}

export async function listImportedTemplates(): Promise<ImportedTemplateOption[]> {
  await ensureDirectory();
  const entries = await fs.readdir(IMPORTED_TEMPLATE_DIRECTORY, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(IMPORTED_TEMPLATE_DIRECTORY, entry.name));
  const snapshots = await Promise.all(files.map((filePath) => readTemplateFile(filePath)));

  return snapshots
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .map((template) => toOption(template));
}

export async function getImportedTemplate(id: string): Promise<ImportedTemplateSnapshot> {
  const filePath = await getTemplateFilePath(id);

  try {
    return await readTemplateFile(filePath);
  } catch {
    throw new Error(`Imported template "${id}" was not found.`);
  }
}

export async function saveImportedTemplateFromProject(
  projectPath: string,
  includedRelativePaths: string[],
  providedName?: string | null
): Promise<ImportedTemplateSnapshot> {
  const tree = await createImportedProjectTemplate(projectPath, includedRelativePaths);
  const name = providedName?.trim() ? providedName.trim() : await resolveDefaultTemplateName();
  const id = await resolveUniqueId(name);
  const savedAt = new Date().toISOString();
  const snapshot: ImportedTemplateSnapshot = {
    id,
    name,
    description: `Imported from ${path.basename(projectPath)} with ${String(includedRelativePaths.length)} file${includedRelativePaths.length === 1 ? "" : "s"}.`,
    sourceProjectPath: projectPath,
    savedAt,
    fileCount: includedRelativePaths.length,
    tree,
  };

  const filePath = await getTemplateFilePath(id);
  await fs.writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  return snapshot;
}

export async function updateImportedTemplate(
  id: string,
  updates: {
    name?: string | null;
    tree?: ProjectTreeNode[] | null;
  }
): Promise<ImportedTemplateSnapshot> {
  const current = await getImportedTemplate(id);
  const nextTree = updates.tree ?? current.tree;
  const fileCount = countFiles(nextTree);
  const nextName = updates.name?.trim() ? updates.name.trim() : current.name;
  const nextSnapshot: ImportedTemplateSnapshot = {
    ...current,
    name: nextName,
    description: `Imported from ${path.basename(current.sourceProjectPath)} with ${String(fileCount)} file${fileCount === 1 ? "" : "s"}.`,
    savedAt: new Date().toISOString(),
    fileCount,
    tree: nextTree,
  };

  const filePath = await getTemplateFilePath(id);
  await fs.writeFile(filePath, `${JSON.stringify(nextSnapshot, null, 2)}\n`, "utf8");

  return nextSnapshot;
}

export async function deleteImportedTemplate(id: string): Promise<void> {
  const filePath = await getTemplateFilePath(id);

  try {
    await fs.unlink(filePath);
  } catch {
    throw new Error(`Imported template "${id}" was not found.`);
  }
}
