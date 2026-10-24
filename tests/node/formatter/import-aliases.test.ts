import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readAliasPrefixes } from "../../../node/formatter/import-aliases";

const projects: string[] = [];

function projectWith(tsconfig: string) {
	const folder = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-aliases-"));
	fs.writeFileSync(path.join(folder, "tsconfig.json"), tsconfig);
	projects.push(folder);

	return folder;
}

afterEach(() => {
	for (const folder of projects.splice(0)) fs.rmSync(folder, { recursive: true, force: true });
});

describe("readAliasPrefixes", () => {
	it("reads a path alias whose pattern looks like a block comment opening", () => {
		const project = projectWith(
			[
				"{",
				'  "compilerOptions": {',
				"    /* Bundler mode */",
				'    "paths": { "@/*": ["./src/*"] },',
				"    /* Linting */",
				'    "strict": true',
				"  }",
				"}",
			].join("\n"),
		);

		expect(readAliasPrefixes(project)).toEqual(["@/"]);
	});

	it("keeps a string holding // while dropping line comments", () => {
		const project = projectWith(
			[
				"{",
				"  // a comment",
				'  "compilerOptions": { "baseUrl": "https://example.com", "paths": { "~lib/*": ["./lib/*"] } }',
				"}",
			].join("\n"),
		);

		expect(readAliasPrefixes(project)).toEqual(["~lib/"]);
	});
});
