// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { XTermPanel } from "../../src/renderer/features/workspace/components/XTermPanel";
import { beginRestart, rebindRun, stopTerminalPool } from "../../src/renderer/shared/terminal";

/**
 * Restarting an agent replaces the process, not the panel. What is on screen —
 * the terminal, its scrollback, its place in the tab — has to come through the
 * swap untouched, with the next session writing into it.
 */

const terminals: Record<string, unknown>[] = [];

vi.mock("@xterm/xterm", () => ({
	Terminal: vi.fn(() => {
		const term = {
			buffer: { active: { getLine: () => null } },
			options: {},
			cols: 80,
			rows: 24,
			loadAddon: vi.fn(),
			open: vi.fn(),
			onData: vi.fn(),
			parser: {
				registerCsiHandler: vi.fn(() => ({ dispose: vi.fn() })),
				registerOscHandler: vi.fn(() => ({ dispose: vi.fn() })),
			},
			registerLinkProvider: vi.fn(),
			write: vi.fn(),
			focus: vi.fn(),
			paste: vi.fn(),
			dispose: vi.fn(),
		};

		terminals.push(term);
		return term;
	}),
}));

vi.mock("@xterm/addon-fit", () => ({ FitAddon: vi.fn(() => ({ fit: vi.fn() })) }));

class StubResizeObserver {
	observe() {}
	disconnect() {}
}

let killSession: (event: { runId: string }) => void = () => {};
let sendData: (event: { runId: string; data: string; seq?: number }) => void = () => {};

beforeEach(() => {
	terminals.length = 0;

	vi.stubGlobal("ResizeObserver", StubResizeObserver);

	for (const property of ["offsetWidth", "offsetHeight"]) {
		Object.defineProperty(HTMLElement.prototype, property, { configurable: true, get: () => 400 });
	}

	Object.defineProperty(globalThis, "lazify", {
		configurable: true,
		value: {
			ptyResize: vi.fn(),
			ptyWrite: vi.fn(),
			onPtyData: vi.fn((callback) => {
				sendData = callback;
				return () => {};
			}),
			onSessionKilled: vi.fn((callback) => {
				killSession = callback;
				return () => {};
			}),
			saveClipboardImage: vi.fn().mockResolvedValue(null),
			ptyBacklog: vi.fn().mockResolvedValue({ data: "resumed\n", seq: 1 }),
		},
	});
});

afterEach(() => {
	cleanup();
	stopTerminalPool();
	vi.unstubAllGlobals();
});

describe("restarting a session under a live terminal", () => {
	it("keeps the terminal and hands it the new session", async () => {
		const { rerender } = render(createElement(XTermPanel, { runId: "pty-old" }));

		await waitFor(() => expect(terminals).toHaveLength(1));

		const term = terminals[0];

		beginRestart("pty-old");
		killSession({ runId: "pty-old" });

		// The session ending is expected, so it takes nothing with it.
		expect(term.dispose).not.toHaveBeenCalled();

		rebindRun("pty-old", "pty-new");
		rerender(createElement(XTermPanel, { runId: "pty-new" }));

		await waitFor(() => expect(term.write).toHaveBeenCalledWith("resumed\n"));

		sendData({ runId: "pty-new", data: "hello from the new run", seq: 2 });

		expect(terminals).toHaveLength(1);
		expect(term.write).toHaveBeenCalledWith("hello from the new run");
		expect(term.dispose).not.toHaveBeenCalled();
	});

	it("still tears down a session that ends on its own", async () => {
		render(createElement(XTermPanel, { runId: "pty-old" }));

		await waitFor(() => expect(terminals).toHaveLength(1));

		killSession({ runId: "pty-old" });

		expect(terminals[0].dispose).toHaveBeenCalled();
	});
});
