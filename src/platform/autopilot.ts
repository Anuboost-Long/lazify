import type { AutopilotSettings } from "@/shared/lib/agents/autopilot-store";

import { appDataPath, readTextFile, writeTextFile } from "./folders";

export type { AutopilotSettings } from "@/shared/lib/agents/autopilot-store";

const STORE_FILE = "agent-autopilot.json";

let current: AutopilotSettings = { enabled: false, excludedProjects: [] };

async function storePath() {
	return `${await appDataPath()}/${STORE_FILE}`;
}

export async function autopilotSettings(): Promise<AutopilotSettings> {
	try {
		const parsed = JSON.parse((await readTextFile(await storePath())) ?? "") as Partial<AutopilotSettings>;

		current = {
			enabled: parsed.enabled === true,
			excludedProjects: Array.isArray(parsed.excludedProjects) ? parsed.excludedProjects : [],
		};
	} catch {
		current = { enabled: false, excludedProjects: [] };
	}

	return current;
}

async function save(settings: AutopilotSettings): Promise<AutopilotSettings> {
	await writeTextFile(await storePath(), JSON.stringify(settings, null, 2));
	current = settings;

	return settings;
}

export async function setAutopilot(enabled: boolean): Promise<AutopilotSettings> {
	return save({ ...(await autopilotSettings()), enabled });
}

export async function setAutopilotProject(projectPath: string, enabled: boolean): Promise<AutopilotSettings> {
	const settings = await autopilotSettings();
	const excluded = settings.excludedProjects.filter((entry) => entry !== projectPath);

	return save({ ...settings, excludedProjects: enabled ? excluded : [...excluded, projectPath] });
}

export function isAutopilotActive(projectPath: string): boolean {
	return current.enabled && !current.excludedProjects.includes(projectPath);
}
