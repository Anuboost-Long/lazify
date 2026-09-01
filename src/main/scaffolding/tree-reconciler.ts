import fs from "node:fs";
import path from "node:path";

import type { ProjectTreeNode } from "../../renderer/shared/types/lazify";

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

export function reconcileProjectStructure(
	projectPath: string,
	tree: ProjectTreeNode[],
	extraReplaceableRoots: string[] = [],
) {
	const replaceableRoots = new Set([...REPLACEABLE_ROOT_PATHS, ...extraReplaceableRoots]);

	for (const node of tree) {
		const targetPath = path.join(projectPath, node.name);

		if (node.type === "folder" && replaceableRoots.has(node.name) && fs.existsSync(targetPath)) {
			fs.rmSync(targetPath, { recursive: true, force: true });
		}

		writeNode(targetPath, node);
	}
}

function writeNode(targetPath: string, node: ProjectTreeNode) {
	if (node.type === "folder") {
		fs.mkdirSync(targetPath, { recursive: true });

		for (const child of node.children) {
			writeNode(path.join(targetPath, child.name), child);
		}

		return;
	}

	fs.mkdirSync(path.dirname(targetPath), { recursive: true });

	if (path.basename(targetPath) === "package.json" && fs.existsSync(targetPath) && node.content) {
		fs.writeFileSync(targetPath, mergePackageJsonContents(targetPath, node.content), "utf8");
		return;
	}

	fs.writeFileSync(targetPath, node.content ?? "", "utf8");
}

type PackageJsonRecord = Record<string, unknown>;

function mergePackageJsonContents(targetPath: string, templateContent: string) {
	const existingPackageJson = parseJsonFile(targetPath);
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

function parseJsonFile(filePath: string): PackageJsonRecord {
	return parseJsonContent(fs.readFileSync(filePath, "utf8"));
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
