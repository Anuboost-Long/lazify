import nodePath from "node:path";
import { describe, expect, it } from "vitest";

import path from "@/shared/lib/path";

const node = nodePath.posix;

const samples = [
	"",
	".",
	"..",
	"/",
	"//",
	"/a",
	"/a/",
	"a",
	"a/",
	"a/b/c",
	"/a/b/../c",
	"a/./b/./c",
	"../a/b",
	"a/../../b",
	"/a/../../b",
	"/Users/dev/My Project/src/app.tsx",
	".env",
	".env.local",
	"archive.tar.gz",
	"dir.with.dots/file",
	"file.",
	"/trailing//slashes//",
];

describe("posix path helper", () => {
	it.each(samples)("normalize, basename, dirname, extname and isAbsolute agree with Node for %j", (sample) => {
		expect(path.normalize(sample)).toBe(node.normalize(sample));
		expect(path.basename(sample)).toBe(node.basename(sample));
		expect(path.dirname(sample)).toBe(node.dirname(sample));
		expect(path.extname(sample)).toBe(node.extname(sample));
		expect(path.isAbsolute(sample)).toBe(node.isAbsolute(sample));
	});

	it.each([
		[["/a", "b", "c"]],
		[["/a/", "/b/", "c/"]],
		[["a", "", "b"]],
		[["", ""]],
		[["/a", "../..", "b"]],
		[["a", ".."]],
	])("join agrees with Node for %j", (parts) => {
		expect(path.join(...parts)).toBe(node.join(...parts));
	});

	it.each([
		[["/a", "b"]],
		[["/a", "/b", "c"]],
		[["/a/b", "../c"]],
		[["/a", "b/", "./c/"]],
		[["/"]],
		[["/a/../.."]],
	])("resolve agrees with Node for absolute starts %j", (parts) => {
		expect(path.resolve(...parts)).toBe(node.resolve(...parts));
	});

	it.each([
		["/a/b/c", "/a/b/c/d/e"],
		["/a/b/c", "/a/x"],
		["/a/b", "/a/b"],
		["/", "/a/b"],
		["/a/b/", "/a/b/c.txt"],
		["/Users/dev/proj", "/Users/dev/proj/src/index.ts"],
	])("relative agrees with Node for %j -> %j", (from, to) => {
		expect(path.relative(from, to)).toBe(node.relative(from, to));
	});

	it("strips a suffix like Node", () => {
		expect(path.basename("/a/app.config.ts", ".ts")).toBe(node.basename("/a/app.config.ts", ".ts"));
		expect(path.basename("/a/.ts", ".ts")).toBe(node.basename("/a/.ts", ".ts"));
	});
});
