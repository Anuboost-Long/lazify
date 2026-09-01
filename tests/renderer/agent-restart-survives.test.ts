// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAgentTerminals } from "@renderer/features/agents/hooks/agent-terminals";
import { useMonitorPanels } from "@renderer/features/agents/hooks/use-monitor-panels";
import { forgetAllRestarts } from "@renderer/shared/terminal/session-restart";

/**
 * Restarting an agent to pick up the theme must not read as the session ending.
 *
 * Both surfaces drop what they are showing when a session is killed, which is
 * right for a run that is over and wrong for one being replaced. These hold the
 * tab and the monitor panel in place across the swap, and check that an
 * ordinary kill still clears them.
 */

let killSession: (event: { runId: string }) => void = () => {};

const SESSION = {
	runId: "pty-old",
	scriptName: "Codex",
	projectPath: "/work/app",
	projectName: "app",
	isAgent: true,
	waiting: false,
};

beforeEach(() => {
	forgetAllRestarts();
	localStorage.clear();

	Object.defineProperty(globalThis, "lazify", {
		configurable: true,
		value: {
			listSessions: vi.fn().mockResolvedValue([SESSION]),
			listAgents: vi.fn().mockResolvedValue([{ id: "codex", label: "Codex", available: true }]),
			listScripts: vi.fn().mockResolvedValue({}),
			listAgentSessions: vi.fn().mockResolvedValue([]),
			stopScript: vi.fn().mockResolvedValue(undefined),
			openAgentTerminal: vi.fn().mockResolvedValue({ runId: "pty-new" }),
			onScriptStatus: vi.fn().mockReturnValue(() => {}),
			onAgentAttention: vi.fn().mockReturnValue(() => {}),
			onSessionKilled: vi.fn((callback) => {
				killSession = callback;
				return () => {};
			}),
			ptyWrite: vi.fn(),
			ptyResize: vi.fn(),
			onPtyData: vi.fn().mockReturnValue(() => {}),
			ptyBacklog: vi.fn().mockResolvedValue({ data: "", seq: 0 }),
		},
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("restarting an agent in place", () => {
	it("keeps the tab and points it at the session that took over", async () => {
		const { result } = renderHook(() => useAgentTerminals("/work/app"));

		await waitFor(() => expect(result.current.terminals).toHaveLength(1));

		const [tab] = result.current.terminals;

		const { restartAgentSession } =
			await import("@renderer/features/agents/hooks/restart-agent-session");

		const restarted = restartAgentSession({
			runId: "pty-old",
			kind: "agent",
			sourceId: "codex",
			projectPath: "/work/app",
		});

		// What main sends the moment the old session is stopped.
		killSession({ runId: "pty-old" });

		await restarted;

		await waitFor(() => expect(result.current.terminals[0]?.runId).toBe("pty-new"));

		expect(result.current.terminals).toHaveLength(1);
		expect(result.current.terminals[0].tabId).toBe(tab.tabId);
		expect(result.current.terminals[0].exited).toBe(false);

		// The session ending for any other reason still closes the tab.
		killSession({ runId: "pty-new" });

		await waitFor(() => expect(result.current.terminals).toHaveLength(0));
	});

	it("keeps the monitor panel, with the size and name it was given", async () => {
		const { result } = renderHook(() => useMonitorPanels());

		await waitFor(() => expect(result.current.panels).toHaveLength(1));

		result.current.rename("pty-old", "Watching tests");
		result.current.setSize("pty-old", "wide");

		const { restartAgentSession } =
			await import("@renderer/features/agents/hooks/restart-agent-session");

		const restarted = restartAgentSession({
			runId: "pty-old",
			kind: "agent",
			sourceId: "codex",
			projectPath: "/work/app",
		});

		killSession({ runId: "pty-old" });
		await restarted;

		await waitFor(() => expect(result.current.panels[0]?.runId).toBe("pty-new"));

		expect(result.current.panels).toHaveLength(1);
		expect(result.current.panels[0].displayName).toBe("Watching tests");
		expect(result.current.panels[0].size).toBe("wide");
	});
});
