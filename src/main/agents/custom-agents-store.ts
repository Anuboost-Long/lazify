import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

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

function storeFilePath(): string {
	return path.join(app.getPath("userData"), "custom-agents.json");
}

function slug(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export function listCustomAgents(): CustomAgent[] {
	try {
		const parsed = JSON.parse(fs.readFileSync(storeFilePath(), "utf8")) as CustomAgent[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function writeAll(agents: CustomAgent[]): void {
	const filePath = storeFilePath();
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(agents, null, 2), "utf8");
}

export function getCustomAgent(id: string): CustomAgent | null {
	return listCustomAgents().find((agent) => agent.id === id) ?? null;
}

export function addCustomAgent(input: CustomAgentInput): CustomAgent {
	const agents = listCustomAgents();
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

	writeAll([...agents, agent]);
	return agent;
}

export function removeCustomAgent(id: string): void {
	writeAll(listCustomAgents().filter((agent) => agent.id !== id));
}
