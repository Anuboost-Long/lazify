export interface ListeningProcess {
	pid: number;
	port: number;
	/** Short name from lsof, e.g. "node". */
	command: string;
	address: string;
	/** Full argv, so `node` becomes something the user can recognise. */
	commandLine: string;
	/** Lazify itself. Never killable — it would take the app down. */
	isProtected: boolean;
	/** A script Lazify started. Killable, but the Scripts pane is tidier. */
	isManaged: boolean;
}

export interface KillResult {
	success: boolean;
	message: string;
}
