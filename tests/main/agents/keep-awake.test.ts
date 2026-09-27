import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-keep-awake-"));
const powerSaveBlocker = { start: vi.fn(), stop: vi.fn() };

vi.mock("electron", () => ({ app: { getPath: () => userDataPath }, powerSaveBlocker }));

const { AwakeGuard } = await import("../../../src/main/agents/awake-guard");
const { readKeepAwake, saveKeepAwake } = await import("../../../src/main/agents/keep-awake-store");

beforeEach(() => {
  powerSaveBlocker.start.mockReset().mockReturnValue(7);
  powerSaveBlocker.stop.mockReset();
  fs.rmSync(path.join(userDataPath, "keep-awake.json"), { force: true });
});

describe("keeping the computer awake while agents work", () => {
  it("is on until the user turns it off, and remembers that", () => {
    expect(readKeepAwake()).toBe(true);

    saveKeepAwake(false);

    expect(readKeepAwake()).toBe(false);
  });

  it("holds one blocker while any run is busy and releases it when all are done", () => {
    const guard = new AwakeGuard(true);

    guard.setBusy("a", true);
    guard.setBusy("b", true);
    guard.setBusy("a", false);

    expect(powerSaveBlocker.start).toHaveBeenCalledTimes(1);
    expect(powerSaveBlocker.stop).not.toHaveBeenCalled();

    guard.setBusy("b", false);

    expect(powerSaveBlocker.stop).toHaveBeenCalledWith(7);
  });

  it("never blocks sleep while turned off", () => {
    const guard = new AwakeGuard(false);

    guard.setBusy("a", true);

    expect(powerSaveBlocker.start).not.toHaveBeenCalled();
  });

  it("lets go mid-run when turned off, and takes hold again when turned back on", () => {
    const guard = new AwakeGuard(true);

    guard.setBusy("a", true);
    guard.setEnabled(false);

    expect(powerSaveBlocker.stop).toHaveBeenCalledWith(7);

    guard.setEnabled(true);

    expect(powerSaveBlocker.start).toHaveBeenCalledTimes(2);
  });
});
