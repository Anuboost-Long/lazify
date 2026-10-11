import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it, vi } from "vitest";

import { CREATION_CASES, execReply, registryReply, runCase } from "../../../../tests/shared/lib/scaffolding/creation.cases";
import type { CreationCase } from "../../../../tests/shared/lib/scaffolding/creation.cases";

const electronRepo = path.resolve(__dirname, "../../../../../lazify");
let current: CreationCase;

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => os.tmpdir(), isPackaged: false, getAppPath: () => electronRepo };
	return { app, default: { app } };
});

vi.mock("node:child_process", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:child_process")>();
	const execFile = Object.assign(
		() => {
			throw new Error("callback form not used");
		},
		{
			[promisify.custom]: async (command: string, args: string[]) => {
				const reply = await execReply(current, command, args);
				if ("fail" in reply) throw Object.assign(new Error(reply.fail), { stdout: "", stderr: reply.stderr });
				return { stdout: reply.stdout, stderr: "" };
			},
		},
	);

	return { ...actual, default: { ...actual, execFile }, execFile };
});

vi.stubGlobal("fetch", async (url: URL | string) => {
	const reply = registryReply(current, String(url));
	if (reply === "offline") throw new TypeError("fetch failed");
	return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body };
});

const { createProject } = await import("../../../../../lazify/src/main/scaffolding/workflow/create");

const base = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-creation-"));

afterAll(() => fs.rm(base, { recursive: true, force: true }));

describe("project creation golden", () => {
	CREATION_CASES.forEach((testCase, index) => {
		it(testCase.name, async () => {
			current = testCase;
			// Electron checks its own bundled Node; Chain checks the user's (ticket 005).
			// Both read the case's version here, so the rest of the flow is compared.
			Object.defineProperty(process, "version", { value: testCase.nodeVersion ?? "v22.12.0", configurable: true });
			expect(await runCase(testCase, path.join(base, String(index)), os.tmpdir(), createProject as never)).toMatchSnapshot();
		});
	});
});
