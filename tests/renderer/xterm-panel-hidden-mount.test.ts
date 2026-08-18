// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { XTermPanel } from "../../src/renderer/features/workspace/components/XTermPanel";
import { stopTerminalPool } from "../../src/renderer/shared/terminal";

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
      registerLinkProvider: vi.fn(),
      write: vi.fn(),
      focus: vi.fn(),
      paste: vi.fn(),
      dispose: vi.fn()
    };

    terminals.push(term);
    return term;
  })
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: vi.fn(() => ({ fit: vi.fn() }))
}));

/** Fires on demand, the way a real one does when a hidden panel is shown. */
const observers: (() => void)[] = [];

class StubResizeObserver {
  constructor(private readonly callback: () => void) {
    observers.push(() => this.callback());
  }
  observe() {}
  disconnect() {}
}

/** jsdom lays nothing out, so the box a panel reports has to be stated. */
function setLaidOut(visible: boolean) {
  for (const property of ["offsetWidth", "offsetHeight"]) {
    Object.defineProperty(HTMLElement.prototype, property, {
      configurable: true,
      get: () => (visible ? 400 : 0)
    });
  }
}

beforeEach(() => {
  terminals.length = 0;
  observers.length = 0;

  vi.stubGlobal("ResizeObserver", StubResizeObserver);
  Object.defineProperty(globalThis, "lazify", {
    configurable: true,
    value: {
      ptyResize: vi.fn(),
      ptyWrite: vi.fn(),
      onPtyData: vi.fn().mockReturnValue(() => {}),
      onSessionKilled: vi.fn().mockReturnValue(() => {}),
      saveClipboardImage: vi.fn().mockResolvedValue(null),
      ptyBacklog: vi.fn().mockResolvedValue({ data: "npm run dev\n", seq: 4 })
    }
  });
});

afterEach(() => {
  cleanup();
  // Terminals outlive the components that mount them, so the pool has to be
  // emptied between tests or the next one reuses this one's instance.
  stopTerminalPool();
  vi.unstubAllGlobals();
});

describe("a terminal mounted behind a closed panel", () => {
  it("waits for a box to measure against before building", async () => {
    setLaidOut(false);

    render(createElement(XTermPanel, { runId: "pty-1" }));

    // Opening here would measure a zero-sized cell, and the terminal would then
    // paint nothing however often it was fitted afterwards.
    expect(terminals).toHaveLength(0);
    expect(globalThis.lazify.ptyBacklog).not.toHaveBeenCalled();
  });

  it("builds and replays the transcript once the panel is opened", async () => {
    setLaidOut(false);

    render(createElement(XTermPanel, { runId: "pty-1" }));
    expect(terminals).toHaveLength(0);

    setLaidOut(true);
    observers.forEach((fire) => fire());

    await waitFor(() => expect(terminals).toHaveLength(1));
    await waitFor(() =>
      expect(globalThis.lazify.ptyBacklog).toHaveBeenCalledWith("pty-1")
    );
    await waitFor(() =>
      expect(terminals[0].write).toHaveBeenCalledWith("npm run dev\n")
    );
  });

  it("builds straight away when the panel is already open", async () => {
    setLaidOut(true);

    render(createElement(XTermPanel, { runId: "pty-1" }));

    await waitFor(() => expect(terminals).toHaveLength(1));
  });
});
