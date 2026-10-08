import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { exercise, useGitEnv } from "../../../../tests/shared/lib/git/git.scenarios";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-user-data-"));

afterAll(() => fs.rmSync(userData, { recursive: true, force: true }));

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => userData };
	return { app, default: { app } };
});

useGitEnv();

const api = {
	...(await import("../../../../../lazify/src/main/projects/project-git-status")),
	...(await import("../../../../../lazify/src/main/projects/git-actions")),
	...(await import("../../../../../lazify/src/main/agents/agent-changes")),
};

describe("git golden", () => {
	it("runs the same scenario on a real repository", async () => {
		const results = await exercise(api);
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	}, 30000);
});
