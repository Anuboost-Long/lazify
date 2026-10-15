import { detectProjectStack } from "@/shared/lib/stack-detection/detect-stack";
import { readPackageJson } from "@/shared/lib/stack-detection/package-json-reader";
import path from "@/shared/lib/path";
import { listFolderTree, pathExists, projectReader, readTextLossy } from "@/platform/folders";
import type { FolderTreeEntry } from "@/platform/folders";

import type { ProjectInventory } from "./types";

const IGNORED_DIRECTORY_NAMES = [
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
	"TestResults",
];

const MAX_WALK_DEPTH = 10;
const MAX_WALK_FILES = 20000;

function depthOf(relativePath: string): number {
	return relativePath.split("/").length;
}

/** `listFolderTree` already skips ignored directories; depth and the file cap are applied here. */
function walkProjectFiles(projectPath: string, entries: FolderTreeEntry[]) {
	const files = entries
		.filter((entry) => entry.kind === "file")
		.map((entry) => path.relative(projectPath, entry.path))
		.filter((relativePath) => depthOf(relativePath) <= MAX_WALK_DEPTH)
		.sort((left, right) => left.localeCompare(right));

	return {
		files: files.slice(0, MAX_WALK_FILES),
		truncated: files.length > MAX_WALK_FILES,
	};
}

const MANIFEST_NAMES = new Set([
	"package.json",
	"composer.json",
	"requirements.txt",
	"pyproject.toml",
	"Pipfile",
	"setup.py",
]);

const isManifest = (file: string) =>
	MANIFEST_NAMES.has(file.slice(file.lastIndexOf("/") + 1)) || /\.(csproj|fsproj)$/i.test(file);

/**
 * What each manifest declares, kept per file rather than as one blob: a
 * repository's root says nothing about what its `backend/` depends on.
 */
async function readManifests(projectPath: string, files: string[]) {
	const present = files.filter(isManifest).slice(0, 60);
	const contents = await Promise.all(
		present.map((manifest) =>
			readTextLossy(path.join(projectPath, manifest))
				.then((text) => text.toLowerCase())
				.catch(() => ""),
		),
	);

	return new Map(present.map((manifest, at) => [manifest, contents[at]]));
}

export async function createProjectInventory(projectPath: string): Promise<ProjectInventory> {
	const resolvedProjectPath = path.resolve(projectPath);

	if (!(await pathExists(resolvedProjectPath))) {
		throw new Error("That project folder no longer exists.");
	}

	const reader = projectReader(resolvedProjectPath);
	const [stack, packageJsonResult, treeEntries] = await Promise.all([
		detectProjectStack(reader),
		readPackageJson(reader),
		listFolderTree(resolvedProjectPath, IGNORED_DIRECTORY_NAMES),
	]);

	const walkResult = walkProjectFiles(resolvedProjectPath, treeEntries);
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
			(await readTextLossy(path.join(resolvedProjectPath, relativePath))).replace(/^﻿/, ""),
	};
}
