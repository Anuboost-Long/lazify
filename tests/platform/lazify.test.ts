import { describe, expect, it, vi } from "vitest";

vi.mock("@chain/sdk", () => ({ desktop: {} }));

const { lazify } = await import("@/platform/lazify");

describe("pathForDroppedFile", () => {
	it("answers no path, as Electron does for a file not on disk — drops arrive natively", () => {
		expect(lazify.pathForDroppedFile(new File([], "a.txt"))).toBe("");
	});
});
