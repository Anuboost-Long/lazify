import { desktop } from "@chain/sdk";

import {
	IGNORED_DIRECTORY_NAMES,
	importProjectIndexFromDirectory as importIndex,
} from "@/shared/lib/projects/project-importer-optimized";
import { searchProject as search } from "@/shared/lib/projects/project-search";
import type { ProjectSearchQuery, ProjectSearchResult } from "@/shared/lib/projects/project-search";
import type { ImportedProjectIndexResult } from "@/shared/types/project-tree";

import { withFolderSnapshot } from "./fs";

export {
	addEnvVariable,
	createProjectEnvFile,
	deleteEnvVariable,
	listProjectEnvFiles,
	readProjectEnvFile,
	updateEnvVariable,
} from "@/shared/lib/projects/env";
export { readProjectAssetFile } from "@/shared/lib/projects/project-asset-reader";
export { importProjectFromDirectory } from "@/shared/lib/projects/project-importer";
export { readImportedProjectFile } from "@/shared/lib/projects/project-importer-optimized";
export type { ProjectSearchQuery, ProjectSearchResult } from "@/shared/lib/projects/project-search";

const SKIPPED_FOLDERS = [...IGNORED_DIRECTORY_NAMES, ".git"];

export function searchProject(projectPath: string, query: ProjectSearchQuery): Promise<ProjectSearchResult> {
	return withFolderSnapshot(projectPath, SKIPPED_FOLDERS, () => search(projectPath, query));
}

export function importProjectIndexFromDirectory(projectPath: string): Promise<ImportedProjectIndexResult> {
	return withFolderSnapshot(projectPath, SKIPPED_FOLDERS, () => importIndex(projectPath));
}

export async function selectDirectory(): Promise<string | null> {
	const [grant] = await desktop.folders.pick();
	return grant?.path ?? null;
}

export async function selectDirectories(): Promise<string[]> {
	return (await desktop.folders.pick({ multiple: true })).map((grant) => grant.path);
}

export async function selectPaths(_defaultPath?: string | null): Promise<string[]> {
	return (await desktop.folders.pick({ multiple: true, files: true })).map((grant) => grant.path);
}
