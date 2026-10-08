import { isDotnetScript, listDotnetScripts, resolveDotnetLaunch, waitForDotnetPortsFree } from "@/shared/lib/environment/dotnet-runner";
import { resolveDevPortInjection } from "@/shared/lib/environment/dev-port";
import { buildProcessTree, getDescendantPids, scanListeningPorts } from "@/shared/lib/environment/ports";
import { choosePackageManager } from "@/shared/lib/environment/scanner";
import type { PtySession } from "@/shared/types/sessions";

import { clearAttentionOnSubmit, isAgentRun, isHiddenRun, isWaiting } from "./agents";
import { projectReader } from "./folders";
import { killPty, listPtySessions, ptyWrite as writeToPty, startPty } from "./terminal";

export { onPtyData, onScriptStatus, ptyBacklog, ptyResize } from "./terminal";
export type { PtyBacklog, PtyDataEvent } from "./terminal";

export interface ScriptLaunch {
	runId: string;
	ptyAvailable: boolean;
}

const sessionKilledListeners = new Set<(event: { runId: string }) => void>();

export async function listScripts(projectPath: string): Promise<Record<string, string>> {
	const project = projectReader(projectPath);
	const dotnetScripts = await listDotnetScripts(project);
	const raw = await project.readText("package.json");
	if (raw === null) return dotnetScripts;

	const packageJson = JSON.parse(raw) as Record<string, unknown>;
	return { ...((packageJson.scripts ?? {}) as Record<string, string>), ...dotnetScripts };
}

async function launchScript(projectPath: string, scriptName: string, cols: number, rows: number): Promise<ScriptLaunch> {
	const project = projectReader(projectPath);
	const dotnetLaunch = await resolveDotnetLaunch(project, scriptName);
	const packageManager = await choosePackageManager(project);
	const { extraArgs, env } = dotnetLaunch
		? { extraArgs: [] as string[], env: {} as Record<string, string> }
		: await resolveDevPortInjection(project, scriptName, packageManager);
	const command = dotnetLaunch?.command ?? packageManager;
	const args = dotnetLaunch
		? dotnetLaunch.args
		: [...(packageManager === "yarn" ? [scriptName] : ["run", scriptName]), ...extraArgs];

	const runId = await startPty({ command, args, cwd: projectPath, scriptName, cols, rows, env });
	return { runId, ptyAvailable: true };
}

export function runScript(projectPath: string, scriptName: string, cols = 220, rows = 50): Promise<ScriptLaunch> {
	return launchScript(projectPath, scriptName, cols, rows);
}

export async function stopScript(runId: string): Promise<void> {
	await killPty(runId);
	for (const listener of sessionKilledListeners) listener({ runId });
}

export async function restartScript(
	runId: string,
	projectPath: string,
	scriptName: string,
	cols = 220,
	rows = 50,
): Promise<ScriptLaunch> {
	await killPty(runId);

	if (isDotnetScript(scriptName)) {
		await waitForDotnetPortsFree(projectReader(projectPath));
	}

	return launchScript(projectPath, scriptName, cols, rows);
}

export function ptyWrite(runId: string, data: string): void {
	clearAttentionOnSubmit(runId, data);
	writeToPty(runId, data);
}

export async function listSessions(): Promise<PtySession[]> {
	const all = await listPtySessions();
	const hidden = await Promise.all(all.map((session) => isHiddenRun(session.runId)));
	const sessions = all.filter((_session, index) => !hidden[index]);
	if (sessions.length === 0) return [];

	const [ports, tree] = await Promise.all([scanListeningPorts(), buildProcessTree()]);

	return Promise.all(
		sessions.map(async (session) => {
			const descendants = getDescendantPids(session.pid, tree);

			return {
				...session,
				ports: ports
					.filter((port) => descendants.has(port.pid))
					.map((port) => ({ port: port.port, command: port.command, address: port.address })),
				waiting: await isWaiting(session.runId),
				isAgent: await isAgentRun(session.runId),
			};
		}),
	);
}

export function onSessionKilled(callback: (event: { runId: string }) => void): () => void {
	sessionKilledListeners.add(callback);

	return () => {
		sessionKilledListeners.delete(callback);
	};
}
