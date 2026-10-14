import { describe, expect, it } from "vitest";

import { mountPointFrom } from "@/shared/lib/dmg/volume";

describe("mountPointFrom", () => {
	it("reads the mount point hdiutil attach printed", () => {
		const output = "/dev/disk4          \tGUID_partition_scheme\n/dev/disk4s1        \tApple_HFS\t/Volumes/MyApp\n";

		expect(mountPointFrom(output)).toBe("/Volumes/MyApp");
	});

	it("trims trailing whitespace off the path", () => {
		expect(mountPointFrom("/dev/disk4s1\tApple_HFS\t/Volumes/MyApp   \n")).toBe("/Volumes/MyApp");
	});

	it("answers null when attach said nothing about a volume", () => {
		expect(mountPointFrom("hdiutil: attach failed - no mountable file systems")).toBeNull();
	});
});
