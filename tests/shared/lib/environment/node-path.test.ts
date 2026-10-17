import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Electron's node-path cases, on Lazify Chain's module, which asks the user's
 * own `node` (through their login shell's PATH) for its path rather than walking
 * PATH itself. Electron's "never the Electron binary" case has no counterpart:
 * nothing here runs inside a Node binary that PATH could point back at.
 */

const execFile = vi.fn();

vi.mock("@/platform/exec", () => ({ execFile: (...args: unknown[]) => execFile(...args) }));

async function load() {
	vi.resetModules();
	return import("@/shared/lib/environment/node-path");
}

beforeEach(() => {
	execFile.mockReset();
});

describe("findNodeBinary", () => {
	it("answers with the node the user's own PATH resolves", async () => {
		execFile.mockResolvedValue({ stdout: "/Users/me/.nvm/versions/node/v20.11.0/bin/node\n", stderr: "" });
		const { findNodeBinary } = await load();

		expect(await findNodeBinary()).toBe("/Users/me/.nvm/versions/node/v20.11.0/bin/node");
		expect(execFile).toHaveBeenCalledWith("node", ["-p", "process.execPath"], expect.anything());
	});

	it("answers nothing rather than a path that cannot run as node", async () => {
		execFile.mockRejectedValue(new Error("node: command not found"));
		const { findNodeBinary } = await load();

		expect(await findNodeBinary()).toBeNull();
	});

	it("keeps only a success, so Node installed while Lazify runs is found on the next ask", async () => {
		execFile.mockRejectedValueOnce(new Error("node: command not found"));
		const { findNodeBinary } = await load();
		expect(await findNodeBinary()).toBeNull();

		execFile.mockResolvedValue({ stdout: "/opt/homebrew/bin/node\n", stderr: "" });
		expect(await findNodeBinary()).toBe("/opt/homebrew/bin/node");
		expect(await findNodeBinary()).toBe("/opt/homebrew/bin/node");
		expect(execFile).toHaveBeenCalledTimes(2);
	});
});
