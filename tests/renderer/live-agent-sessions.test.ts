// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useLiveAgentSessions } from "../../src/renderer/features/agents/hooks/use-live-agent-sessions";
import type { PtySession } from "../../src/renderer/shared/types/lazify";

function session(overrides: Partial<PtySession> = {}): PtySession {
	return {
		runId: "pty-agent",
		scriptName: "Claude Code",
		projectPath: "/workspace/demo",
		projectName: "Demo",
		pid: 4321,
		startedAt: "2026-09-01T00:00:00.000Z",
		ports: [],
		waiting: false,
		isAgent: true,
		...overrides,
	};
}

type Listener<TEvent> = (event: TEvent) => void;

function setLazifyApi(sessions: PtySession[]) {
	const listeners: {
		killed?: Listener<{ runId: string }>;
		attention?: Listener<{ runId: string; waiting: boolean }>;
	} = {};

	const api = {
		listSessions: vi.fn().mockResolvedValue(sessions),
		listAgents: vi.fn().mockResolvedValue([{ id: "claude", label: "Claude Code" }]),
		onScriptStatus: vi.fn().mockReturnValue(() => {}),
		onSessionKilled: vi.fn((listener: Listener<{ runId: string }>) => {
			listeners.killed = listener;
			return () => {};
		}),
		onAgentAttention: vi.fn((listener: Listener<{ runId: string; waiting: boolean }>) => {
			listeners.attention = listener;
			return () => {};
		}),
	};

	Object.defineProperty(globalThis, "lazify", { configurable: true, value: api });
	return listeners;
}

afterEach(() => cleanup());

describe("useLiveAgentSessions", () => {
	it("keeps agent runs and leaves scripts out of it", async () => {
		setLazifyApi([session(), session({ runId: "pty-dev", scriptName: "dev", isAgent: false })]);

		const { result } = renderHook(() => useLiveAgentSessions());

		await waitFor(() => expect(result.current.sessions).toHaveLength(1));
		expect(result.current.sessions[0]).toMatchObject({ runId: "pty-agent", agentId: "claude" });
	});

	it("forgets a session once its process is gone", async () => {
		const listeners = setLazifyApi([session()]);

		const { result } = renderHook(() => useLiveAgentSessions());
		await waitFor(() => expect(result.current.sessions).toHaveLength(1));

		act(() => listeners.killed?.({ runId: "pty-agent" }));

		expect(result.current.sessions).toHaveLength(0);
	});

	it("follows an agent asking for the user", async () => {
		const listeners = setLazifyApi([session()]);

		const { result } = renderHook(() => useLiveAgentSessions());
		await waitFor(() => expect(result.current.sessions).toHaveLength(1));

		act(() => listeners.attention?.({ runId: "pty-agent", waiting: true }));

		expect(result.current.sessions[0].waiting).toBe(true);
	});
});
