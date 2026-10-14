import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import type { ExtensionProvider } from "@/shared/lib/extensions";

/**
 * A real child process speaking LSP over stdio, run the way `process-runner`
 * runs it: bytes out, text in. Its messages carry multi-byte text, so a frame
 * counted in characters rather than bytes would cut them short.
 */

const SERVER = String.raw`
let buffer = Buffer.alloc(0);
let settings = null;
const send = (message) => {
  const body = JSON.stringify({ jsonrpc: "2.0", ...message });
  process.stdout.write("Content-Length: " + Buffer.byteLength(body) + "\r\n\r\n" + body);
};
const publish = (uri, text) => send({
  method: "textDocument/publishDiagnostics",
  params: {
    uri,
    diagnostics: text.split("\n").flatMap((line, index) => line.includes("BAD") ? [{
      range: { start: { line: index, character: line.indexOf("BAD") }, end: { line: index, character: line.indexOf("BAD") + 3 } },
      code: index % 2 ? 1854 : "S1764",
      message: "Remove « BAD » 🚫 (" + settings.mode + ")",
    }] : []),
  },
});
process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const end = buffer.indexOf("\r\n\r\n");
    if (end === -1) return;
    const length = Number(/Content-Length: (\d+)/.exec(buffer.subarray(0, end).toString())[1]);
    if (buffer.length < end + 4 + length) return;
    const message = JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString());
    buffer = buffer.subarray(end + 4 + length);
    if (message.method === "initialize") {
      send({ id: 99, method: "workspace/configuration", params: { items: [{}] } });
      send({ id: message.id, result: { capabilities: {} } });
    }
    if (message.id === 99) settings = message.result[0];
    if (message.method === "textDocument/didOpen") publish(message.params.textDocument.uri, message.params.textDocument.text);
    if (message.method === "textDocument/didChange") publish(message.params.textDocument.uri, message.params.contentChanges[0].text);
  }
});
`;

vi.mock("@chain/sdk", () => ({
	desktop: {
		processRunner: {
			run: async (
				command: string,
				args: string[],
				onOutput: (chunk: { stream: "stdout" | "stderr"; data: Uint8Array }) => void,
				options: { cwd?: string; env?: Record<string, string> },
			) => {
				const child = spawn(command, args, { cwd: options.cwd, env: { ...process.env, ...options.env } });

				child.stdout.on("data", (data: Buffer) => onOutput({ stream: "stdout", data: new Uint8Array(data) }));

				return {
					id: String(child.pid),
					write: async (text: string) => void child.stdin.write(text),
					closeStdin: async () => void child.stdin.end(),
					kill: async () => void child.kill(),
					exited: new Promise((resolve) => child.on("exit", (code) => resolve({ code, killed: child.killed }))),
				};
			},
		},
	},
}));

vi.mock("@/platform/session-path", () => ({ withSessionPath: (env: Record<string, string>) => env }));

const { LanguageServerSession } = await import("@/shared/lib/linting/engines/lsp/session");

const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "lazify-lsp-")));
const project = path.join(base, "my project #1");
const server = path.join(base, "server.cjs");

await fs.mkdir(project);
await fs.writeFile(server, SERVER);

const provider = {
	settingsSection: "fake",
	languageIdFor: (filePath: string) => (filePath.endsWith(".ts") ? "typescript" : null),
	defaultSettings: () => ({ mode: "strict" }),
	initializationOptions: async () => ({}),
} as unknown as ExtensionProvider;

const session = new LanguageServerSession(
	provider,
	{ command: process.execPath, args: [server], env: {} },
	project,
	5_000,
	5_000,
);

afterAll(async () => {
	session.dispose();
	await fs.rm(base, { recursive: true, force: true });
});

describe("a language server over stdio", () => {
	it("answers the first document with the server's settings applied", async () => {
		const found = await session.diagnose(path.join(project, "src", "café.ts"), "ok\nconst BAD = 1;\n");

		expect(found).toEqual([
			{
				range: { start: { line: 1, character: 6 }, end: { line: 1, character: 9 } },
				code: 1854,
				message: "Remove « BAD » 🚫 (strict)",
			},
		]);
	});

	it("sends a changed buffer and gets the new findings", async () => {
		const found = await session.diagnose(path.join(project, "src", "café.ts"), "BAD é\n");

		expect(found?.map((finding) => finding.range.start.line)).toEqual([0]);
	});

	it("says nothing about a file the server has no language for", async () => {
		expect(await session.diagnose(path.join(project, "notes.md"), "BAD")).toBeNull();
	});
});
