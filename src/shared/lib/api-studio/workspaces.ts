import type { ProjectInventory } from "./types";

/**
 * A repository is not always one project.
 *
 * `backend/` and `frontend/` beside each other, `apps/*` under a workspace
 * field, a service per folder: each carries its own manifest, its own
 * dependencies, and its own API. Detection reads them one at a time, because a
 * root `package.json` full of Electron never mentions the NestJS underneath it.
 */

const MANIFESTS = new Set([
	"package.json",
	"composer.json",
	"requirements.txt",
	"pyproject.toml",
	"Pipfile",
	"go.mod",
]);

const MANIFEST_SUFFIXES = [".csproj", ".fsproj", ".sln"];
/** Copies a build leaves behind: the same code, discovered twice. */
const BUILT_OUTPUT = /(^|\/)(\.[\w-]*build[\w-]*|out|dist|release|target|publish)\//i;
const MAX_WORKSPACES = 24;
const MAX_DEPTH = 4;

function directoryOf(file: string) {
	const at = file.lastIndexOf("/");

	return at === -1 ? "" : file.slice(0, at);
}

function isManifest(file: string) {
	const name = file.slice(file.lastIndexOf("/") + 1);

	return MANIFESTS.has(name) || MANIFEST_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

/**
 * Every directory that declares itself a project, nearest the root first. The
 * root is always one, so a repository that is a single project is described the
 * same way as one that holds six.
 */
export function findWorkspaces(project: ProjectInventory): string[] {
	const directories = new Set<string>([""]);

	for (const file of project.files) {
		if (!isManifest(file) || BUILT_OUTPUT.test(file)) continue;

		const directory = directoryOf(file);

		if (directory.split("/").filter(Boolean).length > MAX_DEPTH) continue;

		directories.add(directory);
	}

	return Array.from(directories)
		.sort(
			(left, right) => left.split("/").length - right.split("/").length || left.localeCompare(right),
		)
		.slice(0, MAX_WORKSPACES);
}

/** A file belongs to the nearest project above it, and to that one only. */
function ownerOf(file: string, workspaces: string[]) {
	return workspaces.reduce(
		(owner, workspace) =>
			workspace.length > owner.length && file.startsWith(`${workspace}/`) ? workspace : owner,
		"",
	);
}

/**
 * The same repository, seen as one of its projects: the files that belong to it
 * and no others, and the dependencies its own manifests declare. Without the
 * split, a root full of Electron answers for the NestJS underneath it and every
 * route is found twice.
 */
export function inventoryOf(
	project: ProjectInventory,
	workspace: string,
	workspaces: string[],
): ProjectInventory {
	const files = project.files.filter(
		(file) => !BUILT_OUTPUT.test(file) && ownerOf(file, workspaces) === workspace,
	);
	const manifests = files.filter((file) => isManifest(file) && directoryOf(file) === workspace);

	return {
		...project,
		files,
		hasDependency: (name: string) =>
			manifests.some((manifest) => project.manifestOf(manifest).includes(name.toLowerCase())),
	};
}
