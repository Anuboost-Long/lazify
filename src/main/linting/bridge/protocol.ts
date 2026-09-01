/**
 * What crosses the socket between the app and an agent's session.
 *
 * One line of JSON each way, because the client is a script written to a temp
 * directory and parsed by whatever `node` the agent happens to be running —
 * the less it has to agree with, the fewer ways it breaks.
 */

export interface LintBridgeRequest {
	paths: string[];
	/** Where the agent is working, so findings can be named relative to it. */
	projectPath: string;
}

export interface LintBridgeResponse {
	/** Empty when nothing was found — the client then says nothing at all. */
	report: string;
}
