import { environmentVariable } from "@/platform/exec";
import path from "@/shared/lib/path";

import { scanEnvironment } from "../../environment/scanner";
import type { CommandBinary } from "../../environment/scanner";
import type { TemplateDefinition } from "../harmonizer";

export async function resolveTemplateCommand(template: TemplateDefinition): Promise<CommandBinary> {
	const scan = await scanEnvironment();
	const supportedCommands = Object.keys(template.createCommands) as CommandBinary[];

	if (
		supportedCommands.includes(template.preferredPackageManager) &&
		scan.binaries[template.preferredPackageManager].available
	) {
		return template.preferredPackageManager;
	}

	const fallback = supportedCommands.find((command) => scan.binaries[command].available);

	if (!fallback) {
		throw new Error(`No available command runner was found for template "${template.label}".`);
	}

	return fallback;
}

/**
 * Picker choices arrive from the renderer, so a path that climbs out of the
 * project is refused rather than trusted — this one deletes files.
 */
export function resolveInsideProject(projectPath: string, relativePath: string): string {
	const resolved = path.resolve(projectPath, relativePath);
	const root = path.resolve(projectPath);

	if (resolved === root || !resolved.startsWith(root + path.sep)) {
		throw new Error(`Refusing to touch a path outside the project: ${relativePath}`);
	}

	return resolved;
}

export async function resolveUserPath(inputPath: string): Promise<string> {
	if (inputPath === "~") {
		return (await environmentVariable("HOME")) ?? inputPath;
	}

	if (inputPath.startsWith("~/")) {
		return path.join((await environmentVariable("HOME")) ?? "~", inputPath.slice(2));
	}

	return inputPath;
}
