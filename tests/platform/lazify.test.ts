import { describe, expect, it, vi } from "vitest";

vi.mock("@chain/sdk", () => ({ desktop: {} }));

const { lazify } = await import("@/platform/lazify");

describe("unported bridge members", () => {
	it("name the feature the user tried, not the function", async () => {
		await expect(lazify.checkForUpdates()).rejects.toThrow(
			"Updating Lazify isn't available in Lazify Chain yet.",
		);
		await expect(lazify.readApiEnvironments("/work/shop")).rejects.toThrow(
			"API Studio isn't available in Lazify Chain yet.",
		);
	});

	it("throw the same message from synchronous members", () => {
		expect(() => lazify.pathForDroppedFile(new File([], "a.txt"))).toThrow(
			"Dropping files isn't available in Lazify Chain yet.",
		);
	});
});
