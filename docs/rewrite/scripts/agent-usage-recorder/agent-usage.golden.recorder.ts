import { describe, expect, it, vi } from "vitest";

import { exercise, home, respond } from "../../../../tests/shared/lib/agents/agent-usage.scenarios";

let userData = "";

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => userData };
	return { app, default: { app } };
});
vi.mock("node:child_process", () => ({
	execFile: (_command: string, _args: string[], callback: (error: Error) => void) => callback(new Error("no keychain")),
}));

vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string> }) => {
	const response = respond(url, init.headers);
	return new Response(JSON.stringify(response.body), { status: response.status, headers: response.headers });
});

process.env.HOME = home;

const api = {
	...(await import("../../../../../lazify/src/main/agents/agent-usage")),
	...(await import("../../../../../lazify/src/main/agents/agent-limits-store")),
};

describe("agent usage golden", () => {
	it("reports the same usage", async () => {
		const results = await exercise(api, { useUserData: (folder) => (userData = folder) });
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	});
});
