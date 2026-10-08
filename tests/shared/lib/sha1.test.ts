import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { sha1Hex } from "@/shared/lib/sha1";

const nodeSha1 = (text: string) => createHash("sha1").update(text).digest("hex");

describe("sha1Hex", () => {
	it.each([
		"",
		"abc",
		"the quick brown fox jumps over the lazy dog",
		"a".repeat(55),
		"a".repeat(56),
		"a".repeat(64),
		"a".repeat(1000),
		"do you want to run git push origin main? | yes | no",
		"ünïcödé — 日本語 🚀",
	])("matches Node's sha1 for %j", (text) => {
		expect(sha1Hex(text)).toBe(nodeSha1(text));
	});
});
