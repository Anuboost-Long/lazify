import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

import type {
  FileNode,
  FolderNode,
  ProjectTemplate,
  TreeNode as TemplateTreeNode
} from "../../brain/template-engine/types";
import { createProjectTemplateFromSelection, detectFeatures, normalizeStructure, validateTemplate } from "../../brain";
import type {
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ProjectStack,
  ProjectTreeNode,
} from "../../renderer/shared/types/lazify";

// userData, not cwd: a packaged app's working directory is not writable, so
// saving an imported template there failed everywhere except a dev run.
const IMPORTED_TEMPLATE_DIRECTORY = path.join(app.getPath("userData"), "imported-templates");

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
  return normalizeStoredTemplateSnapshot(JSON.parse(content) as Partial<ImportedTemplateSnapshot>);
}

function toOption(template: ImportedTemplateSnapshot): ImportedTemplateOption {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    sourceProjectPath: template.sourceProjectPath,
    savedAt: template.savedAt,
    fileCount: template.fileCount,
    stack: template.stackDetection?.stack ?? "unknown",
  };
}

function toUiTree(tree: TemplateTreeNode[]): ProjectTreeNode[] {
  return tree.map((node) => {
    if (node.type === "file") {
      return {
        id: node.id,
        name: node.name,
        type: "file",
        source: node.source === "generated" ? "custom" : "custom",
        locked: node.locked ?? false,
        content: node.content,
        children: []
      };
    }

    return {
      id: node.id,
      name: node.name,
      type: "folder",
      source: node.source === "generated" ? "custom" : "custom",
      locked: node.locked ?? false,
      children: toUiTree(node.children)
    };
  });
}

function toTemplateTree(tree: ProjectTreeNode[], parentPath = ""): TemplateTreeNode[] {
  return tree.map((node) => {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.type === "file") {
      const extensionIndex = node.name.lastIndexOf(".");
      const extension = extensionIndex >= 0 ? node.name.slice(extensionIndex).toLowerCase() : "";

      return {
        id: node.id,
        name: node.name,
        path: currentPath,
        type: "file",
        extension,
        role: "unknown",
        includeContent: typeof node.content === "string",
        content: node.content,
        isBinary: false,
        locked: node.locked,
        source: "custom"
      };
    }

    return {
      id: node.id,
      name: node.name,
      path: currentPath,
      type: "folder",
      role: "unknown",
      locked: node.locked,
      source: "custom",
      children: toTemplateTree(node.children, currentPath)
    };
  });
}

function normalizeStoredTemplateSnapshot(rawTemplate: Partial<ImportedTemplateSnapshot>): ImportedTemplateSnapshot {
  const legacyTree = Array.isArray(rawTemplate.tree) ? rawTemplate.tree : [];
  const structureTree = rawTemplate.structure?.tree;
  const normalizedTemplateTree = Array.isArray(structureTree)
    ? structureTree
    : toTemplateTree(legacyTree);
  const createdAt = rawTemplate.metadata?.createdAt ?? rawTemplate.savedAt ?? new Date().toISOString();
  const updatedAt = rawTemplate.metadata?.updatedAt ?? rawTemplate.savedAt;
  const files = rawTemplate.structure?.files ?? collectFiles(normalizedTemplateTree);
  const folders = rawTemplate.structure?.folders ?? collectFolders(normalizedTemplateTree);
  const snapshot: ImportedTemplateSnapshot = {
    id: rawTemplate.id ?? "unknown-template",
    name: rawTemplate.name ?? "Imported template",
    description: rawTemplate.description ?? "Imported template",
    sourceProjectPath: rawTemplate.sourceProjectPath ?? "",
    savedAt: rawTemplate.savedAt ?? updatedAt ?? createdAt,
    fileCount: rawTemplate.fileCount ?? files.length,
    stackDetection: rawTemplate.stackDetection ?? {
      stack: "unknown",
      framework: "unknown",
      metaFramework: "unknown",
      packageManager: "unknown",
      commands: { install: "npm install" },
      confidence: 0.1,
      reasons: [],
      warnings: ["Template was saved before stack detection was available."]
    },
    structure: {
      files,
      folders,
      tree: normalizedTemplateTree
    },
    features: rawTemplate.features ?? [],
    tags: rawTemplate.tags ?? [],
    metadata: {
      createdAt,
      updatedAt,
      fileCount: rawTemplate.metadata?.fileCount ?? files.length,
      folderCount: rawTemplate.metadata?.folderCount ?? folders.length,
      selectedItemCount: rawTemplate.metadata?.selectedItemCount ?? files.length + folders.length,
      originalFileCount: rawTemplate.metadata?.originalFileCount
    },
    tree: legacyTree.length > 0 ? legacyTree : toUiTree(normalizedTemplateTree)
  };

  return snapshot;
}

function collectFiles(tree: TemplateTreeNode[]): FileNode[] {
  const files: FileNode[] = [];

  for (const node of tree) {
    if (node.type === "file") {
      files.push(node);
    } else {
      files.push(...collectFiles(node.children));
    }
  }

  return files;
}

function collectFolders(tree: TemplateTreeNode[]): FolderNode[] {
  const folders: FolderNode[] = [];

  for (const node of tree) {
    if (node.type === "folder") {
      folders.push({
        id: node.id,
        name: node.name,
        path: node.path,
        type: "folder",
        role: node.role,
        locked: node.locked,
        source: node.source
      });
      folders.push(...collectFolders(node.children));
    }
  }

  return folders;
}

function toStoredTemplateSnapshot(template: ProjectTemplate, savedAt: string): ImportedTemplateSnapshot {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    sourceProjectPath: template.sourceProjectPath ?? "",
    savedAt,
    fileCount: template.metadata.fileCount,
    stackDetection: template.stackDetection,
    structure: template.structure,
    features: template.features,
    tags: template.tags,
    metadata: {
      ...template.metadata,
      updatedAt: template.metadata.updatedAt ?? savedAt
    },
    tree: toUiTree(template.structure.tree ?? [])
  };
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
  providedName?: string | null,
  confirmedStack?: string | null
): Promise<ImportedTemplateSnapshot> {
  const name = providedName?.trim() ? providedName.trim() : await resolveDefaultTemplateName();
  const id = await resolveUniqueId(name);
  const savedAt = new Date().toISOString();
  const projectTemplate = await createProjectTemplateFromSelection({
    projectRoot: projectPath,
    includedRelativePaths,
    name,
    id,
    confirmedStack: (confirmedStack?.trim() || undefined) as ProjectStack | undefined
  });
  const snapshot = toStoredTemplateSnapshot(
    {
      ...projectTemplate,
      metadata: {
        ...projectTemplate.metadata,
        createdAt: savedAt,
        updatedAt: savedAt
      }
    },
    savedAt
  );

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
  const nextName = updates.name?.trim() ? updates.name.trim() : current.name;
  const normalizedTemplateTree = toTemplateTree(nextTree);
  const { files, folders } = normalizeStructure(normalizedTemplateTree);
  const features = detectFeatures(files, folders);
  const tags = [...new Set([
    current.stackDetection.stack,
    current.stackDetection.framework,
    current.stackDetection.metaFramework,
    ...features
  ])];
  const updatedAt = new Date().toISOString();
  const nextSnapshot: ImportedTemplateSnapshot = {
    ...current,
    name: nextName,
    description: `Imported from ${path.basename(current.sourceProjectPath)} with ${String(files.length)} file${files.length === 1 ? "" : "s"}.`,
    savedAt: updatedAt,
    fileCount: files.length,
    structure: {
      files,
      folders,
      tree: normalizedTemplateTree
    },
    features,
    tags,
    metadata: {
      ...current.metadata,
      updatedAt,
      fileCount: files.length,
      folderCount: folders.length,
      selectedItemCount: files.length + folders.length
    },
    tree: nextTree,
  };
  const validation = validateTemplate({
    id: nextSnapshot.id,
    name: nextSnapshot.name,
    description: nextSnapshot.description,
    sourceProjectPath: nextSnapshot.sourceProjectPath,
    stackDetection: nextSnapshot.stackDetection,
    structure: nextSnapshot.structure,
    features: nextSnapshot.features,
    tags: nextSnapshot.tags,
    metadata: nextSnapshot.metadata
  });

  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

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
