import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `git pull` is run without a terminal, so the command it sends matters: an
 * editor prompt or a missing upstream would hang or fail with nothing the user
 * can act on. These cover the exact arguments and the unpublished-branch retry.
 */

const PROMISIFY_CUSTOM = Symbol.for("nodejs.util.promisify.custom");

const calls: string[][] = [];
let respond: (args: string[]) => Promise<{ stdout: string; stderr: string }>;

vi.mock("node:child_process", () => {
  const execFile = (() => undefined) as unknown as Record<symbol, unknown>;

  execFile[PROMISIFY_CUSTOM] = (_file: string, args: string[]) => {
    calls.push(args);
    return respond(args);
  };

  return { execFile };
});

const { pullCurrentBranch } = await import("../../../src/main/projects/git-actions");

function failWith(stderr: string) {
  return Promise.reject(Object.assign(new Error("Command failed"), { stderr }));
}

describe("pullCurrentBranch", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("pulls without opening an editor for the merge commit", async () => {
    respond = () => Promise.resolve({ stdout: "", stderr: "" });

    const result = await pullCurrentBranch("/workspace/alpha");

    expect(result.success).toBe(true);
    expect(calls).toEqual([["pull", "--no-edit"]]);
  });

  it("retries against origin when the branch has no tracking information", async () => {
    respond = (args) => {
      if (args[0] === "branch") return Promise.resolve({ stdout: "feature/x\n", stderr: "" });

      if (args.includes("origin")) return Promise.resolve({ stdout: "", stderr: "" });

      return failWith("There is no tracking information for the current branch.");
    };

    const result = await pullCurrentBranch("/workspace/alpha");

    expect(result.success).toBe(true);
    expect(calls).toEqual([
      ["pull", "--no-edit"],
      ["branch", "--show-current"],
      ["pull", "--no-edit", "origin", "feature/x"]
    ]);
  });

  it("returns git's own message for any other failure, without retrying", async () => {
    respond = () => failWith("error: Your local changes would be overwritten by merge.");

    const result = await pullCurrentBranch("/workspace/alpha");

    expect(result.success).toBe(false);
    expect(result.message).toBe("error: Your local changes would be overwritten by merge.");
    expect(calls).toEqual([["pull", "--no-edit"]]);
  });
});
