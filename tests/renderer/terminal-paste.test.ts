import { afterEach, describe, expect, it, vi } from "vitest";

import {
  pasteIntoTerminal,
  registerTerminalPaste,
  resetTerminalPaste
} from "../../src/renderer/shared/lib/terminal-paste";

afterEach(() => resetTerminalPaste());

describe("pasting into a terminal from outside it", () => {
  it("pastes straight away when the run's terminal is mounted", () => {
    const paste = vi.fn();
    registerTerminalPaste("run-1", paste);

    pasteIntoTerminal("run-1", "hello");

    expect(paste).toHaveBeenCalledWith("hello");
  });

  it("holds a paste until that run's terminal registers", () => {
    const paste = vi.fn();

    pasteIntoTerminal("run-1", "hello");
    expect(paste).not.toHaveBeenCalled();

    registerTerminalPaste("run-1", paste);

    expect(paste).toHaveBeenCalledWith("hello");
  });

  it("flushes a queue in the order it was filled", () => {
    const paste = vi.fn();

    pasteIntoTerminal("run-1", "first");
    pasteIntoTerminal("run-1", "second");
    registerTerminalPaste("run-1", paste);

    expect(paste.mock.calls.map(([text]) => text)).toEqual(["first", "second"]);
  });

  it("never hands one run's paste to another", () => {
    const mine = vi.fn();
    const theirs = vi.fn();

    pasteIntoTerminal("run-1", "mine");
    registerTerminalPaste("run-2", theirs);
    registerTerminalPaste("run-1", mine);

    expect(theirs).not.toHaveBeenCalled();
    expect(mine).toHaveBeenCalledWith("mine");
  });

  it("stops pasting into a terminal that unmounted", () => {
    const paste = vi.fn();
    const unregister = registerTerminalPaste("run-1", paste);

    unregister();
    pasteIntoTerminal("run-1", "hello");

    expect(paste).not.toHaveBeenCalled();
  });

  it("delivers to the terminal that replaced an unmounted one", () => {
    const gone = vi.fn();
    const fresh = vi.fn();

    registerTerminalPaste("run-1", gone)();
    pasteIntoTerminal("run-1", "hello");
    registerTerminalPaste("run-1", fresh);

    expect(gone).not.toHaveBeenCalled();
    expect(fresh).toHaveBeenCalledWith("hello");
  });
});
