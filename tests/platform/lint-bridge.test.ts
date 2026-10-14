import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AgentServerHandler } from "@chain/sdk";

/**
 * The agent's client script, run by Node, against the bridge's handler served
 * the way `agent-server` serves it: one HTTP request in, one response out.
 */

let lintDelayMs = 0;
const servers: http.Server[] = [];

vi.mock("@chain/sdk", () => ({
	desktop: {
		agentServer: {
			stop: async () => {
				servers.splice(0).forEach((server) => server.close());
			},
			start: (handler: AgentServerHandler) =>
				new Promise((resolve) => {
					const server = http.createServer((request, response) => {
						let body = "";
						request.on("data", (chunk) => (body += chunk));
						request.on("end", async () => {
							const answer = await handler({
								method: request.method ?? "GET",
								path: request.url ?? "/",
								headers: request.headers as Record<string, string>,
								body,
							});
							response.writeHead(answer.status, answer.headers);
							response.end(answer.body);
						});
					});
					servers.push(server);
					server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as { port: number }).port }));
				}),
		},
	},
}));

vi.mock("@/shared/lib/linting/lint-paths", () => ({
	lintPaths: async (paths: string[]) => {
		await new Promise((resolve) => setTimeout(resolve, lintDelayMs));
		return paths.map((filePath) => ({
			path: filePath,
			diagnostics: filePath.endsWith("clean.ts")
				? []
				: [{ source: "sonarlint", rule: "sonarlint/S1854", code: "S1854", message: "Remove this useless assignment.", url: null, line: 2, column: 3, endLine: 2, endColumn: 8 }],
		}));
	},
}));

const storage = new Map<string, string>();
vi.stubGlobal("sessionStorage", {
	getItem: (key: string) => storage.get(key) ?? null,
	setItem: (key: string, value: string) => storage.set(key, value),
});

const { ensureLintBridge } = await import("@/platform/lint-bridge");
const { LINT_CLIENT_SOURCE } = await import("@/shared/lib/linting/bridge/client-source");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-bridge-")));
const client = path.join(base, "lint.cjs");
await fs.writeFile(client, LINT_CLIENT_SOURCE);

afterAll(async () => {
	servers.forEach((server) => server.close());
	await fs.rm(base, { recursive: true, force: true });
});

function runClient(env: Record<string, string>, args: string[], stdin = ""): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = execFile(process.execPath, [client, ...args], { env: { ...process.env, ...env } }, (error, stdout) =>
			error ? reject(error) : resolve(stdout),
		);
		child.stdin?.end(stdin);
	});
}

beforeEach(() => {
	lintDelayMs = 0;
});

describe("the lint bridge", () => {
	it("hands an agent its findings, named from where it works", async () => {
		const bridge = await ensureLintBridge();
		const output = await runClient(
			{ LAZIFY_LINT_URL: bridge!.url, LAZIFY_LINT_TOKEN: bridge!.token, LAZIFY_LINT_PROJECT: "/work/shop" },
			["/work/shop/src/cart.ts"],
		);

		expect(output).toBe(
			[
				"1 SonarQube for IDE finding in the file you just wrote:",
				"",
				"src/cart.ts",
				"  2:3  S1854 (sonarlint/S1854)  Remove this useless assignment.",
				"",
				"Fix these before moving on. Leave the surrounding behaviour unchanged, and",
				"do not reformat code the rules are not about.",
				"",
			].join("\n"),
		);
	});

	it("waits out an analysis slower than one request", async () => {
		lintDelayMs = 900;
		const bridge = await ensureLintBridge();
		const output = await runClient(
			{ LAZIFY_LINT_URL: bridge!.url, LAZIFY_LINT_TOKEN: bridge!.token, LAZIFY_LINT_PROJECT: "/work/shop" },
			[],
			JSON.stringify({ tool_input: { file_path: "/work/shop/src/cart.ts" } }),
		);

		expect(JSON.parse(output).hookSpecificOutput.additionalContext).toContain("src/cart.ts");
	});

	it("says nothing about a clean file", async () => {
		const bridge = await ensureLintBridge();

		expect(
			await runClient({ LAZIFY_LINT_URL: bridge!.url, LAZIFY_LINT_TOKEN: bridge!.token }, ["/work/shop/src/clean.ts"]),
		).toBe("");
	});

	it("answers nothing to a program without this run's token", async () => {
		const bridge = await ensureLintBridge();

		expect(await runClient({ LAZIFY_LINT_URL: bridge!.url, LAZIFY_LINT_TOKEN: "guess" }, ["/work/shop/src/cart.ts"])).toBe("");

		const response = await fetch(`${bridge!.url}/lint`, { method: "POST", body: JSON.stringify({ paths: ["/a.ts"] }) });
		expect(response.status).toBe(403);
	});

	it("exits quietly when Lazify is not there", async () => {
		expect(await runClient({ LAZIFY_LINT_URL: "http://127.0.0.1:9", LAZIFY_LINT_TOKEN: "x" }, ["/a.ts"])).toBe("");
		expect(await runClient({ LAZIFY_LINT_URL: "" }, ["/a.ts"])).toBe("");
	});
});
