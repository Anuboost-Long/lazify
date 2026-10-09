import { describe, expect, it, vi } from "vitest";

import { nodeFolders } from "../../../platform/node-folders";

import { exercise } from "./agent-sessions.scenarios";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));
vi.mock("@/platform/exec", () => ({ environmentVariable: async (name: string) => process.env[name] ?? null }));

const { listAgentSessions } = await import("@/shared/lib/agents/agent-sessions");

describe("agent sessions golden", () => {
	it("lists the same past sessions", async () => {
		const results = await exercise(listAgentSessions);
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	});
});
