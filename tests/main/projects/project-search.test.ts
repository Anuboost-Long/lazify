import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { searchProject } from "../../../src/main/projects/project-search";
import type { ProjectSearchQuery } from "../../../src/main/projects/project-search";

let project: string;

const query = (overrides: Partial<ProjectSearchQuery> = {}): ProjectSearchQuery => ({
	query: "HandleValidateToken",
	matchCase: false,
	wholeWord: false,
	useRegex: false,
	include: "",
	exclude: "",
	useIgnoreFiles: true,
	...overrides,
});

const write = async (relativePath: string, contents: string) => {
	const target = path.join(project, relativePath);
	await fs.mkdir(path.dirname(target), { recursive: true });
	await fs.writeFile(target, contents, "utf8");
};

beforeEach(async () => {
	project = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-search-"));

	await write(
		"src/Services/JwtTokenService.cs",
		"await FuncAuthTokenValidate.HandleValidateToken();",
	);
	await write(
		"src/Utility/JwtTokenHelper.cs",
		["using System;", "await FuncAuthTokenValidate.HandleValidateToken();"].join("\n"),
	);
	await write("src/notes.md", "handlevalidatetoken lowercase mention");
	await write("dist/bundle.js", "HandleValidateToken from a build artifact");
	await write(".gitignore", "secrets/\n");
	await write("secrets/keys.cs", "HandleValidateToken in an ignored folder");
});

afterEach(async () => {
	await fs.rm(project, { recursive: true, force: true });
});

describe("searchProject", () => {
	it("finds every match and reports where it sits on the line", async () => {
		const result = await searchProject(project, query());

		expect(result.error).toBeNull();
		expect(result.fileCount).toBe(3);
		expect(result.matchCount).toBe(3);

		const helper = result.files.find((file) => file.name === "JwtTokenHelper.cs");
		expect(helper?.directory).toBe("src/Utility");
		expect(helper?.matches[0].line).toBe(2);
		expect(helper?.matches[0].preview.slice(helper.matches[0].start, helper.matches[0].end)).toBe(
			"HandleValidateToken",
		);
	});

	it("skips build output and gitignored files, unless ignore files are turned off", async () => {
		const honoured = await searchProject(project, query());
		expect(honoured.files.map((file) => file.relativePath)).not.toContain("secrets/keys.cs");
		expect(honoured.files.map((file) => file.relativePath)).not.toContain("dist/bundle.js");

		const ignored = await searchProject(project, query({ useIgnoreFiles: false }));
		expect(ignored.files.map((file) => file.relativePath)).toContain("secrets/keys.cs");
	});

	it("narrows by case, include globs and exclude globs", async () => {
		const cased = await searchProject(project, query({ matchCase: true }));
		expect(cased.matchCount).toBe(2);

		const included = await searchProject(project, query({ include: "**/*.md" }));
		expect(included.files.map((file) => file.relativePath)).toEqual(["src/notes.md"]);

		const excluded = await searchProject(project, query({ exclude: "src/Utility" }));
		expect(excluded.files.map((file) => file.relativePath)).not.toContain(
			"src/Utility/JwtTokenHelper.cs",
		);
	});

	it("reads a regex when asked, and reports one that will not compile", async () => {
		const matched = await searchProject(project, query({ query: "Handle\\w+Token", useRegex: true }));
		expect(matched.matchCount).toBe(3);

		const broken = await searchProject(project, query({ query: "Handle(", useRegex: true }));
		expect(broken.error).not.toBeNull();
		expect(broken.files).toEqual([]);
	});

	it("matches whole words only when asked", async () => {
		await write("src/Extra.cs", "HandleValidateTokenIsActive();");

		const loose = await searchProject(project, query());
		expect(loose.matchCount).toBe(4);

		const whole = await searchProject(project, query({ wholeWord: true }));
		expect(whole.matchCount).toBe(3);
	});
});
