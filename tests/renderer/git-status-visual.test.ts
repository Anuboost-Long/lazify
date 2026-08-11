import { describe, expect, it } from "vitest";

import {
  isStaged,
  statusChar,
  statusToneClass
} from "../../src/renderer/features/workspace/components/git-status/status-visual";
import type { GitStatusEntry } from "../../src/renderer/shared/types/lazify";

function entry(stagedStatus: string, unstagedStatus: string): GitStatusEntry {
  return {
    path: "src/app.ts",
    absolutePath: "/repo/src/app.ts",
    stagedStatus,
    unstagedStatus,
    statusLabel: "test"
  };
}

const UNTRACKED = entry("?", "?");
const ADDED = entry("A", " ");
const MODIFIED = entry(" ", "M");
const DELETED = entry(" ", "D");

describe("the letter beside a changed file", () => {
  it("marks an untracked file as added rather than unknown", () => {
    expect(statusChar(UNTRACKED)).toBe("A");
  });

  it("leaves every other state as git reports it", () => {
    expect(statusChar(ADDED)).toBe("A");
    expect(statusChar(MODIFIED)).toBe("M");
    expect(statusChar(DELETED)).toBe("D");
  });

  it("shows additions in green, not the user's accent colour", () => {
    expect(statusToneClass(UNTRACKED)).toBe(statusToneClass(ADDED));
    expect(statusToneClass(UNTRACKED)).toBe("text-success");
  });

  it("keeps deletions and modifications distinct", () => {
    expect(statusToneClass(DELETED)).toBe("text-error");
    expect(statusToneClass(MODIFIED)).toBe("text-warning");
  });

  it("still tells a staged addition from an untracked file", () => {
    expect(isStaged(ADDED)).toBe(true);
    expect(isStaged(UNTRACKED)).toBe(false);
  });
});
