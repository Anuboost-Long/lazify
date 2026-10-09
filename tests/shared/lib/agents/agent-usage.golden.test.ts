import { describe, expect, it, vi } from "vitest";

import { appFolders, nodeFolders } from "../../../platform/node-folders";

import { exercise, respond } from "./agent-usage.scenarios";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/exec", () => ({
	currentOs: async () => "macos",
	environmentVariable: async (name: string) => process.env[name] ?? null,
	execFile: async () => {
		throw new Error("no keychain");
	},
}));
vi.mock("@/platform/http", () => ({
	getJson: async (url: string, headers: Record<string, string>) => {
		const response = respond(url, headers);
		return { ok: response.status < 300, headers: response.headers, data: response.body };
	},
}));

const api = {
	...(await import("@/shared/lib/agents/agent-usage")),
	...(await import("@/shared/lib/agents/agent-limits-store")),
};

describe("agent usage golden", () => {
	it("reports the same usage", async () => {
		const results = await exercise(api, { useUserData: (folder) => (appFolders.data = folder) });
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	});
});
