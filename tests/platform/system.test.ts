import { beforeEach, describe, expect, it, vi } from "vitest";

const folders = new Set<string>();
let osascript: (args: string[]) => Promise<{ stdout: string; stderr: string }>;

vi.mock("@/platform/folders", () => ({
	appTempPath: async () => "/temp",
	createFolder: async (path: string) => {
		folders.add(path);
	},
	deletePath: async (path: string) => {
		folders.delete(path);
	},
}));

vi.mock("@/platform/exec", async () => {
	class ExecFileError extends Error {
		constructor(
			message: string,
			readonly code: number | null,
			readonly killed: boolean,
			readonly stdout: string,
			readonly stderr: string,
		) {
			super(message);
		}
	}

	return { ExecFileError, execFile: (_command: string, args: string[]) => osascript(args) };
});

const { ExecFileError } = await import("@/platform/exec");
const { saveClipboardImage } = await import("@/platform/system");

const failure = (stderr: string) => () => Promise.reject(new ExecFileError("osascript exited with 1", 1, false, "", stderr));

beforeEach(() => folders.clear());

describe("saveClipboardImage", () => {
	it("saves a copied image as screenshot.png in its own temp folder, passing the path as an argument", async () => {
		let received: string[] = [];
		osascript = async (args) => {
			received = args;
			return { stdout: "", stderr: "" };
		};

		const saved = await saveClipboardImage();

		expect(saved).toMatch(/^\/temp\/lazify-paste-\d+-[0-9a-f]{6}\/screenshot\.png$/);
		expect(received.at(-1)).toBe(saved);
		expect(folders).toEqual(new Set([saved?.replace("/screenshot.png", "")]));
	});

	it("answers null and leaves nothing behind when the clipboard holds no image", async () => {
		osascript = failure("199:206: execution error: Can’t make some data into the expected type. (-1700)");

		await expect(saveClipboardImage()).resolves.toBeNull();
		expect(folders.size).toBe(0);
	});

	it("reports any other failure, still leaving nothing behind", async () => {
		osascript = failure("execution error: Not authorized. (-1743)");

		await expect(saveClipboardImage()).rejects.toThrow("osascript exited with 1");
		expect(folders.size).toBe(0);
	});
});
