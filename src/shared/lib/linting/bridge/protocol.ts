/**
 * What crosses the bridge between the app and an agent's session.
 *
 * Plain JSON over HTTP on 127.0.0.1, because the client is a script written to
 * a temp directory and parsed by whatever `node` the agent happens to be
 * running — the less it has to agree with, the fewer ways it breaks.
 *
 * The server answers every request at once and serves one at a time, while a
 * first analysis can take a minute and a half. So the client posts its paths,
 * is handed a job, and asks after that job until the report is ready.
 */

export const LINT_PATH = "/lint";
export const TOKEN_HEADER = "x-lazify-token";

export interface LintBridgeRequest {
	paths: string[];
	/** Where the agent is working, so findings can be named relative to it. */
	projectPath: string;
}

export type LintBridgeResponse =
	| { job: string }
	| { pending: true }
	/** Empty when nothing was found — the client then says nothing at all. */
	| { report: string };
