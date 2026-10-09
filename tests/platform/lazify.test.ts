import { describe, expect, it, vi } from "vitest";

vi.mock("@chain/sdk", () => ({ desktop: {} }));

const { lazify } = await import("@/platform/lazify");

describe("unported bridge members", () => {
	it("name the feature the user tried, not the function", async () => {
		await expect(lazify.checkForUpdates()).rejects.toThrow(
			"Updating Lazify isn't available in Lazify Chain yet.",
		);
		const request = { projectPath: "/project", filePath: "/project/a.ts", line: null, command: "" };
		await expect(lazify.openInEditor(request)).rejects.toThrow(
			"Opening files in an editor isn't available in Lazify Chain yet.",
		);
	});

	it("throw the same message from synchronous members", () => {
		expect(() => lazify.pathForDroppedFile(new File([], "a.txt"))).toThrow(
			"Dropping files isn't available in Lazify Chain yet.",
		);
	});
});
