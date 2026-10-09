import { describe, expect, it } from "vitest";

import { exercise } from "../../../../tests/shared/lib/agents/agent-sessions.scenarios";

const { listAgentSessions } = await import("../../../../../lazify/src/main/agents/agent-sessions");

describe("agent sessions golden", () => {
	it("lists the same past sessions", async () => {
		const results = await exercise(listAgentSessions);
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	});
});
