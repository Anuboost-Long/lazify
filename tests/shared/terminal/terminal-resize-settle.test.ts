// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { XTermPanel } from "@/features/workspace/components/XTermPanel";
import { stopTerminalPool } from "@/shared/terminal";

/**
 * An animated layout change resizes a terminal on every frame. Fitting on each
 * one makes the session behind it redraw its whole screen a dozen times, so a
 * terminal waits for its size to settle and tells the session once.
 */

const terminals: { cols: number; rows: number }[] = [];
let fittedCols = 80;
const resizeCallbacks: (() => void)[] = [];

vi.mock("@xterm/xterm", () => ({
	Terminal: vi.fn(function () {
		const term = {
			buffer: { active: { getLine: () => null } },
			options: {},
			cols: 80,
			rows: 24,
			loadAddon: vi.fn(),
			open: vi.fn(),
			onData: vi.fn(),
			onWriteParsed: vi.fn(() => ({ dispose: vi.fn() })),
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

vi.mock("@xterm/addon-fit", () => ({
	FitAddon: vi.fn(function () {
		return {
			fit: vi.fn(() => {
				const term = terminals.at(-1);
				if (term) term.cols = fittedCols;
			}),
		};
	}),
}));

class CapturingResizeObserver {
	constructor(private readonly callback: () => void) {}
	observe() {
		resizeCallbacks.push(this.callback);
	}
	disconnect() {}
}

const ptyResize = vi.fn();

function resizeEveryFrame(frames: number) {
	for (let frame = 0; frame < frames; frame += 1) {
		resizeCallbacks.forEach((callback) => callback());
		vi.advanceTimersByTime(16);
	}
}

beforeEach(() => {
	terminals.length = 0;
	resizeCallbacks.length = 0;
	fittedCols = 80;
	ptyResize.mockReset();

	vi.stubGlobal("ResizeObserver", CapturingResizeObserver);
	for (const property of ["offsetWidth", "offsetHeight"]) {
		Object.defineProperty(HTMLElement.prototype, property, { configurable: true, get: () => 400 });
	}
	Object.defineProperty(globalThis, "lazify", {
		configurable: true,
		value: {
			ptyResize,
			ptyWrite: vi.fn(),
			onPtyData: vi.fn(() => () => {}),
			onSessionKilled: vi.fn(() => () => {}),
			saveClipboardImage: vi.fn().mockResolvedValue(null),
			ptyBacklog: vi.fn().mockResolvedValue({ data: "", seq: 0 }),
		},
	});
});

afterEach(() => {
	cleanup();
	stopTerminalPool();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

async function openTerminal() {
	render(createElement(XTermPanel, { runId: "pty-1" }));
	await waitFor(() => expect(terminals).toHaveLength(1));
	await waitFor(() => expect(ptyResize).toHaveBeenCalled());
	ptyResize.mockClear();
	vi.useFakeTimers();
}

describe("a terminal resized on every frame", () => {
	it("fits once the size settles and tells the session once", async () => {
		await openTerminal();
		fittedCols = 120;

		act(() => resizeEveryFrame(12));
		expect(ptyResize).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(200);
		});
		expect(ptyResize).toHaveBeenCalledTimes(1);
		expect(ptyResize).toHaveBeenCalledWith("pty-1", 120, 24);
	});

	it("leaves the session alone when the fit changes nothing", async () => {
		await openTerminal();

		act(() => {
			resizeEveryFrame(3);
			vi.advanceTimersByTime(200);
		});

		expect(ptyResize).not.toHaveBeenCalled();
	});
});
