import { createFolder, readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";
import { ignoreLazifyDirectory } from "@/shared/lib/projects/lazify-directory";

import { DEFAULT_SCRIPT_GLOBAL, isUsableGlobal } from "./scripting/global-name";

export { DEFAULT_SCRIPT_GLOBAL, isUsableGlobal } from "./scripting/global-name";

const SETTINGS_FILE = ".lazify/api-studio/scripts.json";
const SETTINGS_VERSION = 1;

export interface ScriptSettings {
	global: string;
}

interface StoredSettings {
	version: number;
	global: string;
}

function settingsPath(projectPath: string) {
	return path.join(path.resolve(projectPath), SETTINGS_FILE);
}

export async function readScriptSettings(projectPath: string): Promise<ScriptSettings> {
	try {
		const content = await readTextFile(settingsPath(projectPath));
		if (!content) return { global: DEFAULT_SCRIPT_GLOBAL };

		const stored = JSON.parse(content) as StoredSettings;

		return stored?.version === SETTINGS_VERSION && isUsableGlobal(stored.global)
			? { global: stored.global }
			: { global: DEFAULT_SCRIPT_GLOBAL };
	} catch {
		return { global: DEFAULT_SCRIPT_GLOBAL };
	}
}

export async function saveScriptSettings(projectPath: string, settings: ScriptSettings): Promise<ScriptSettings> {
	const global = isUsableGlobal(settings.global) ? settings.global : DEFAULT_SCRIPT_GLOBAL;
	const filePath = settingsPath(projectPath);
	const stored: StoredSettings = { version: SETTINGS_VERSION, global };

	await createFolder(path.dirname(filePath));
	await ignoreLazifyDirectory(projectPath);
	await writeTextFile(filePath, `${JSON.stringify(stored, null, 2)}\n`);

	return { global };
}
