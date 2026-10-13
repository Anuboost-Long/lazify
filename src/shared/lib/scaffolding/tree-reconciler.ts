import { createFolder, deletePath, pathExists, readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";
import type { ProjectTreeNode } from "@/shared/types/lazify";

const REPLACEABLE_ROOT_PATHS = new Set([
	"@types",
	"api",
	"app",
	"components",
	"constants",
	"core",
	"features",
	"hooks",
	"i18n",
	"lib",
	"messages",
	"navigation",
	"providers",
	"store",
	"translations",
	"types",
]);

export async function reconcileProjectStructure(
	projectPath: string,
	tree: ProjectTreeNode[],
	extraReplaceableRoots: string[] = [],
) {
	const replaceableRoots = new Set([...REPLACEABLE_ROOT_PATHS, ...extraReplaceableRoots]);

	for (const node of tree) {
		const targetPath = path.join(projectPath, node.name);

		if (node.type === "folder" && replaceableRoots.has(node.name)) {
			await deletePath(targetPath);
		}

		await writeNode(targetPath, node);
	}
}

async function writeNode(targetPath: string, node: ProjectTreeNode) {
	if (node.type === "folder") {
		await createFolder(targetPath);

		for (const child of node.children) {
			await writeNode(path.join(targetPath, child.name), child);
		}

		return;
	}

	await createFolder(path.dirname(targetPath));

	if (path.basename(targetPath) === "package.json" && (await pathExists(targetPath)) && node.content) {
		await writeTextFile(targetPath, await mergePackageJsonContents(targetPath, node.content));
		return;
	}

	await writeTextFile(targetPath, node.content ?? "");
}

type PackageJsonRecord = Record<string, unknown>;

async function mergePackageJsonContents(targetPath: string, templateContent: string) {
	const existingPackageJson = parseJsonContent((await readTextFile(targetPath)) ?? "");
	const templatePackageJson = parseJsonContent(templateContent);

	const mergedPackageJson: PackageJsonRecord = {
		...templatePackageJson,
		...existingPackageJson,
		scripts: mergeStringMaps(templatePackageJson.scripts, existingPackageJson.scripts),
		dependencies: mergeStringMaps(templatePackageJson.dependencies, existingPackageJson.dependencies),
		devDependencies: mergeStringMaps(
			templatePackageJson.devDependencies,
			existingPackageJson.devDependencies,
		),
	};

	return `${JSON.stringify(mergedPackageJson, null, 2)}\n`;
}

function parseJsonContent(content: string): PackageJsonRecord {
	const parsed = JSON.parse(content) as unknown;

	if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
		return {};
	}

	return parsed as PackageJsonRecord;
}

function mergeStringMaps(templateValue: unknown, existingValue: unknown) {
	const templateMap = toStringMap(templateValue);
	const existingMap = toStringMap(existingValue);

	if (!templateMap && !existingMap) {
		return undefined;
	}

	return {
		...templateMap,
		...existingMap,
	};
}

function toStringMap(value: unknown): Record<string, string> | undefined {
	if (!value || Array.isArray(value) || typeof value !== "object") {
		return undefined;
	}

	return Object.fromEntries(
		Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
	);
}
