import { describe, expect, it, vi } from "vitest";

vi.mock("@chain/sdk", () => ({ desktop: {} }));

const { lazify } = await import("@/platform/lazify");

describe("unported bridge members", () => {
	it("name the feature the user tried, not the function", async () => {
		await expect(lazify.openPictureInPicture("https://example.com", "browser")).rejects.toThrow(
			"Opening a page in its own window isn't available in Lazify Chain yet.",
		);
	});

});

describe("pathForDroppedFile", () => {
	it("answers no path, as Electron does for a file not on disk — drops arrive natively", () => {
		expect(lazify.pathForDroppedFile(new File([], "a.txt"))).toBe("");
	});
});
