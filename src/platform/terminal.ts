import { desktop } from "@chain/sdk";
import type { ChainError, TerminalSession } from "@chain/sdk";

import type { ScriptStatusEvent } from "@/shared/types/sessions";

export interface PtyDataEvent {
	runId: string;
	data: string;
	seq?: number;
}

export interface PtyBacklog {
	data: string;
	seq: number;
}

export interface PtySessionInfo {
	runId: string;
	scriptName: string;
	projectPath: string;
	projectName: string;
	pid: number;
	startedAt: string;
}

export interface StartPtyOptions {
	command: string;
	args: string[];
	cwd: string;
	scriptName: string;
	cols?: number;
	rows?: number;
	env?: Record<string, string>;
	tags?: Record<string, string>;
}

const RUN_ID_PREFIX = "pty-";

const runIdOf = (sessionId: string) => `${RUN_ID_PREFIX}${sessionId}`;
const sessionIdOf = (runId: string) => runId.slice(RUN_ID_PREFIX.length);

const isNotFound = (error: unknown) => (error as Partial<ChainError> | null)?.code === "NOT_FOUND";

const statusListeners = new Set<(event: ScriptStatusEvent) => void>();

const emitStatus = (event: ScriptStatusEvent) => {
	for (const listener of statusListeners) listener(event);
};

const scriptNameOf = (session: TerminalSession) => session.metadata.scriptName ?? session.label;

async function forgetExited(sessionId: string, code: number | null) {
	const session = (await desktop.terminal.list()).find((candidate) => candidate.id === sessionId);

	if (session) {
		emitStatus({
			runId: runIdOf(sessionId),
			scriptName: scriptNameOf(session),
			status: code === 0 ? "done" : "error",
			exitCode: code,
		});
	}

	await desktop.terminal.remove(sessionId);
}

let tracking: Promise<void> | null = null;

function trackExits() {
	tracking ??= (async () => {
		desktop.terminal.onExit((sessionId, exit) => void forgetExited(sessionId, exit.code));

		for (const session of await desktop.terminal.list()) {
			if (session.exit) await desktop.terminal.remove(session.id);
		}
	})();

	return tracking;
}

export async function startPty({
	command,
	args,
	cwd,
	scriptName,
	cols = 220,
	rows = 50,
	env = {},
	tags = {},
}: StartPtyOptions): Promise<string> {
	await trackExits();

	const session = await desktop.terminal.start({
		command,
		args,
		cwd,
		env,
		cols,
		rows,
		label: scriptName,
		metadata: { ...tags, scriptName, projectPath: cwd },
	});
	const runId = runIdOf(session.id);

	emitStatus({ runId, scriptName, status: "running", exitCode: null });
	return runId;
}

export async function listPtySessions(): Promise<PtySessionInfo[]> {
	await trackExits();

	return (await desktop.terminal.list())
		.filter((session) => session.exit === null)
		.map((session) => {
			const projectPath = session.metadata.projectPath ?? session.cwd ?? "";

			return {
				runId: runIdOf(session.id),
				scriptName: scriptNameOf(session),
				projectPath,
				projectName: projectPath.slice(projectPath.lastIndexOf("/") + 1),
				pid: session.pid ?? 0,
				startedAt: new Date(session.startedAtMs).toISOString(),
			};
		});
}

export async function ptySessionTags(): Promise<Map<string, Record<string, string>>> {
	await trackExits();

	return new Map(
		(await desktop.terminal.list())
			.filter((session) => session.exit === null)
			.map((session) => [runIdOf(session.id), session.metadata]),
	);
}

export async function ptyBacklog(runId: string): Promise<PtyBacklog> {
	try {
		return await desktop.terminal.backlog(sessionIdOf(runId));
	} catch (error) {
		if (isNotFound(error)) return { data: "", seq: 0 };
		throw error;
	}
}

export function ptyWrite(runId: string, data: string): void {
	desktop.terminal.write(sessionIdOf(runId), data).catch(() => undefined);
}

export function ptyResize(runId: string, cols: number, rows: number): void {
	desktop.terminal.resize(sessionIdOf(runId), cols, rows).catch(() => undefined);
}

export async function killPty(runId: string): Promise<void> {
	await desktop.terminal.kill(sessionIdOf(runId)).catch(() => undefined);
}

export function onPtyData(callback: (event: PtyDataEvent) => void): () => void {
	return desktop.terminal.onOutput(({ sessionId, data, seq }) => callback({ runId: runIdOf(sessionId), data, seq }));
}

export function onScriptStatus(callback: (event: ScriptStatusEvent) => void): () => void {
	void trackExits();
	statusListeners.add(callback);

	return () => {
		statusListeners.delete(callback);
	};
}
