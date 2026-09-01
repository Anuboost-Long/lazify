import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import { ensureLintBridge, LINT_CLIENT_SOURCE, warmLintEngines } from "../linting";
import { pruneInstanceDirs } from "./instance-dirs";

/**
 * What an agent is given so it can see the app's findings.
 *
 * The teaching is scoped to the session and nothing else: a script and a
 * settings file in a temp directory, handed over as flags and environment at
 * launch. Nothing is written into the user's project, so an agent started from
 * a plain terminal behaves exactly as it did before — this is a property of
 * having been opened by Lazify, not of the repository.
 *
 * Claude takes hooks, so its findings arrive on their own after every write.
 * The other CLIs have no equivalent, so they get the script and are told about
 * it; whether they use it is up to them.
 */

const HOOK_TOOLS = "Write|Edit|MultiEdit|NotebookEdit";

/** Past SonarLint's own first-result wait, so a cold start is not cut short. */
const HOOK_TIMEOUT_SECONDS = 130;

export interface AgentSessionLint {
	args: string[];
	env: Record<string, string>;
}

const NONE: AgentSessionLint = { args: [], env: {} };

const sessionsRoot = () => path.join(app.getPath("temp"), "lazify-agent-sessions");

function guideFor(automatic: boolean): string {
	const analysis =
		"This project is open in Lazify, which runs SonarQube for IDE and Tailwind CSS analysis on the files you edit.";

	const how = automatic
		? "After you write a source file, its findings come back to you automatically. Treat them as part of the change you just made and fix them before moving on."
		: 'After you write a source file, run `node "$LAZIFY_LINT" <file>` and fix what it reports before moving on.';

	return `${analysis} ${how} Findings are about the code, not its formatting — fix the rule and leave the rest of the file alone.`;
}

function claudeSettings(clientPath: string) {
	return {
		hooks: {
			PostToolUse: [
				{
					matcher: HOOK_TOOLS,
					hooks: [
						{
							type: "command",
							command: `node ${JSON.stringify(clientPath)}`,
							timeout: HOOK_TIMEOUT_SECONDS,
						},
					],
				},
			],
		},
	};
}

/**
 * Prepares one session's lint bridge. Answers a no-op when the bridge cannot
 * be bound — an agent that cannot see findings still has to open.
 */
export async function prepareSessionLint(
	agentId: string,
	projectPath: string,
): Promise<AgentSessionLint> {
	const socket = await ensureLintBridge();

	if (!socket) return NONE;

	const sessionDir = path.join(sessionsRoot(), `${agentId}-${Date.now()}-${process.pid}`);
	const clientPath = path.join(sessionDir, "lint.cjs");

	try {
		fs.mkdirSync(sessionDir, { recursive: true });
		fs.writeFileSync(clientPath, LINT_CLIENT_SOURCE, "utf8");
	} catch {
		return NONE;
	}

	const automatic = agentId === "claude";

	const env: Record<string, string> = {
		LAZIFY_LINT_SOCKET: socket,
		LAZIFY_LINT_PROJECT: projectPath,
		LAZIFY_LINT: clientPath,
		// Readable by a custom agent's command, which is the only way an agent
		// with no hooks and no system-prompt flag can be told any of this.
		LAZIFY_LINT_GUIDE: guideFor(automatic),
	};

	// The first analysis of a project pays for the language server starting up.
	// Spending that now, while the agent is still reading its prompt, keeps it
	// off the agent's first edit.
	void warmLintEngines(projectPath);

	if (!automatic) return { args: [], env };

	const settingsPath = path.join(sessionDir, "settings.json");

	try {
		fs.writeFileSync(settingsPath, JSON.stringify(claudeSettings(clientPath), null, 2), "utf8");
	} catch {
		return { args: [], env };
	}

	return {
		args: ["--settings", settingsPath, "--append-system-prompt", guideFor(true)],
		env,
	};
}

/** Sessions outlive nothing — but another running Lazify's do, so they stay. */
export function clearAgentSessionDirs() {
	pruneInstanceDirs(sessionsRoot(), (name) => Number(name.split("-").at(-1)));
}
