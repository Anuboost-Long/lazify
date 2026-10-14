import { desktop } from "@chain/sdk";
import type { AgentServerRequest, AgentServerResponse } from "@chain/sdk";

import {
	LINT_PATH,
	type LintBridgeRequest,
	type LintBridgeResponse,
	TOKEN_HEADER,
} from "@/shared/lib/linting/bridge/protocol";
import { lintPaths } from "@/shared/lib/linting/lint-paths";
import { buildLintReport } from "@/shared/lib/linting/report";

/**
 * The one door an agent session has into the app's analysis.
 *
 * Agents run as ordinary programs in a terminal, so they cannot reach the
 * window — but they can make a request to 127.0.0.1. Reusing the language
 * servers the editor already holds open is the point: a session of its own
 * would pay SonarLint's cold start again for every agent that opened.
 *
 * Any local program can reach a loopback port, so each request carries the
 * token this run handed its agents.
 */

export interface LintBridge {
	url: string;
	token: string;
}

/** Survives a reload, as the agents told where the bridge is do. */
const SAVED_KEY = "lazify.lintBridge";

/** A client that stopped asking leaves its job behind; this long and it is dropped. */
const ABANDONED_JOB_MS = 5 * 60_000;

const jobs = new Map<string, { report: string | null }>();

const reply = (status: number, answer?: LintBridgeResponse): AgentServerResponse => ({
	status,
	headers: { "content-type": "application/json" },
	body: answer ? JSON.stringify(answer) : "",
});

function headerOf(request: AgentServerRequest, name: string): string | undefined {
	return Object.entries(request.headers).find(([key]) => key.toLowerCase() === name)?.[1];
}

function startJob(body: string): string | null {
	let request: LintBridgeRequest;

	try {
		request = JSON.parse(body) as LintBridgeRequest;
	} catch {
		return null;
	}

	if (!Array.isArray(request.paths) || request.paths.length === 0) return null;

	const id = crypto.randomUUID();
	const job: { report: string | null } = { report: null };

	jobs.set(id, job);
	setTimeout(() => jobs.delete(id), ABANDONED_JOB_MS);

	lintPaths(request.paths)
		.then((results) => buildLintReport(results, request.projectPath ?? ""))
		.then(
			(report) => {
				job.report = report;
			},
			() => {
				job.report = "";
			},
		);

	return id;
}

function answerFor(request: AgentServerRequest, token: string): AgentServerResponse {
	if (headerOf(request, TOKEN_HEADER) !== token) return reply(403);

	if (request.method === "POST" && request.path === LINT_PATH) {
		const job = startJob(request.body);

		return reply(200, job ? { job } : { report: "" });
	}

	if (request.method === "GET" && request.path.startsWith(`${LINT_PATH}/`)) {
		const id = decodeURIComponent(request.path.slice(LINT_PATH.length + 1));
		const job = jobs.get(id);

		if (job?.report === null) return reply(200, { pending: true });

		jobs.delete(id);

		return reply(200, { report: job?.report ?? "" });
	}

	return reply(404);
}

function savedBridge(): { port: number; token: string } | null {
	try {
		return JSON.parse(sessionStorage.getItem(SAVED_KEY) ?? "null") as { port: number; token: string } | null;
	} catch {
		return null;
	}
}

async function open(): Promise<LintBridge | null> {
	const saved = savedBridge();
	const token = saved?.token ?? crypto.randomUUID();
	const handler = async (request: AgentServerRequest) => answerFor(request, token);

	try {
		// One left from before a reload is still bound, with no window behind it.
		await desktop.agentServer.stop();

		const { port } = await desktop.agentServer
			.start(handler, saved ? { port: saved.port } : undefined)
			.catch(() => desktop.agentServer.start(handler));

		sessionStorage.setItem(SAVED_KEY, JSON.stringify({ port, token }));

		return { url: `http://127.0.0.1:${port}`, token };
	} catch {
		return null;
	}
}

let opening: Promise<LintBridge | null> | null = null;

/**
 * Starts the bridge if it is not already up and answers where it listens.
 * Null when it could not be bound — callers then launch the agent without it
 * rather than refusing to launch at all.
 */
export async function ensureLintBridge(): Promise<LintBridge | null> {
	opening ??= open();

	const bridge = await opening;

	if (!bridge) opening = null;

	return bridge;
}
