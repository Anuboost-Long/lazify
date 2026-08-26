import fs from "node:fs";
import net from "node:net";
import path from "node:path";

import { app } from "electron";

import { lintPaths } from "../lint-paths";
import { buildLintReport } from "../report";
import type { LintBridgeRequest, LintBridgeResponse } from "./protocol";

/**
 * The one door an agent session has into the app's analysis.
 *
 * Agents run as ordinary programs in a PTY, so they cannot reach the renderer's
 * IPC — but they can open a socket. That is the whole bridge: a line of JSON in,
 * a line of JSON out, over a socket that exists only while the app does. When
 * the app is closed the socket is gone and every client falls silent, which is
 * the behaviour we want anyway: findings come from language servers this
 * process is holding open.
 *
 * Reusing those warm servers is the point. A session of its own would pay
 * SonarLint's cold start again for every agent that opened.
 */

let server: net.Server | null = null;
let socketPath: string | null = null;

/** Windows has no socket files; a named pipe is the same API to `net`. */
function socketPathFor(): string {
	return process.platform === "win32"
		? String.raw`\\.\pipe\lazify-lint-${process.pid}`
		: path.join(app.getPath("temp"), `lazify-lint-${process.pid}.sock`);
}

async function reportFor(raw: string): Promise<string> {
	const request = JSON.parse(raw) as LintBridgeRequest;

	if (!Array.isArray(request.paths) || request.paths.length === 0) return "";

	return buildLintReport(await lintPaths(request.paths), request.projectPath ?? "");
}

function handle(connection: net.Socket) {
	let raw = "";

	const answer = (report: string) => {
		const response: LintBridgeResponse = { report };

		connection.end(`${JSON.stringify(response)}\n`);
	};

	connection.setEncoding("utf8");
	connection.on("error", () => connection.destroy());
	connection.on("data", (chunk: string) => {
		raw += chunk;

		const newline = raw.indexOf("\n");

		if (newline === -1) return;

		const line = raw.slice(0, newline);

		raw = "";

		reportFor(line).then(answer, () => answer(""));
	});
}

/**
 * Starts the bridge if it is not already up and answers where it listens.
 * Null when it could not be bound — callers then launch the agent without it
 * rather than refusing to launch at all.
 */
export async function ensureLintBridge(): Promise<string | null> {
	if (socketPath) return socketPath;

	const wanted = socketPathFor();

	if (process.platform !== "win32") {
		// A crash leaves the file behind; nothing else can be listening on it,
		// because the name carries this process's own id.
		fs.rmSync(wanted, { force: true });
	}

	return new Promise((resolve) => {
		const listening = net.createServer(handle);

		listening.on("error", () => resolve(null));
		listening.listen(wanted, () => {
			server = listening;
			socketPath = wanted;
			resolve(wanted);
		});
	});
}

export function disposeLintBridge() {
	server?.close();
	server = null;

	if (socketPath && process.platform !== "win32") {
		fs.rmSync(socketPath, { force: true });
	}

	socketPath = null;
}
