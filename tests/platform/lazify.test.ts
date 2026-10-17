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

describe("the page window, until it's ported", () => {
	it("is never open, so asking or closing answers closed rather than failing", async () => {
		const closed = { open: false, url: null, source: null };

		await expect(lazify.getPictureInPictureState()).resolves.toEqual(closed);
		await expect(lazify.closePictureInPicture()).resolves.toEqual(closed);
	});
});

describe("pathForDroppedFile", () => {
	it("answers no path, as Electron does for a file not on disk — drops arrive natively", () => {
		expect(lazify.pathForDroppedFile(new File([], "a.txt"))).toBe("");
	});
});
