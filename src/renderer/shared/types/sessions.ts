export interface ScriptStatusEvent {
	runId: string;
	scriptName: string;
	status: "running" | "done" | "error";
	exitCode: number | null;
}

export interface SessionPort {
	port: number;
	command: string;
	address: string;
}

export interface PtySession {
	runId: string;
	scriptName: string;
	projectPath: string;
	projectName: string;
	pid: number;
	startedAt: string;
	ports: SessionPort[];
	/** True when the agent is currently believed to be waiting on the user. */
	waiting: boolean;
	/** True for agent runs, false for scripts — only agents can be typed into. */
	isAgent: boolean;
}
