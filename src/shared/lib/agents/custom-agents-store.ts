import { appDataPath, readTextFile, writeTextFile } from "@/platform/folders";

/**
 * User-defined agents, persisted alongside the app's other data.
 *
 * A custom agent is just a display name, an optional icon image (stored inline
 * as a data URL so it travels with the entry) and a shell command to launch —
 * the agent-registry turns that command into a PTY the same way built-ins run.
 */

export interface CustomAgent {
	id: string;
	label: string;
	command: string;
	/** Optional icon, stored as a data URL. */
	image?: string;
}

export interface CustomAgentInput {
	label: string;
	command: string;
	image?: string;
}

async function storeFilePath(): Promise<string> {
	return `${await appDataPath()}/custom-agents.json`;
}

function slug(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export async function listCustomAgents(): Promise<CustomAgent[]> {
	try {
		const parsed = JSON.parse((await readTextFile(await storeFilePath())) ?? "") as CustomAgent[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

async function writeAll(agents: CustomAgent[]): Promise<void> {
	await writeTextFile(await storeFilePath(), JSON.stringify(agents, null, 2));
}

export async function getCustomAgent(id: string): Promise<CustomAgent | null> {
	return (await listCustomAgents()).find((agent) => agent.id === id) ?? null;
}

export async function addCustomAgent(input: CustomAgentInput): Promise<CustomAgent> {
	const agents = await listCustomAgents();
	const taken = new Set(agents.map((agent) => agent.id));
	// `custom-` prefix keeps generated ids clear of the built-in agent ids.
	const base = `custom-${slug(input.label) || "agent"}`;

	let id = base;
	let index = 2;
	while (taken.has(id)) {
		id = `${base}-${String(index)}`;
		index += 1;
	}

	const agent: CustomAgent = {
		id,
		label: input.label.trim(),
		command: input.command.trim(),
		...(input.image ? { image: input.image } : {}),
	};

	await writeAll([...agents, agent]);
	return agent;
}

export async function removeCustomAgent(id: string): Promise<void> {
	await writeAll((await listCustomAgents()).filter((agent) => agent.id !== id));
}
