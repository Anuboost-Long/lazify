import { describe, expect, it } from "vitest";

import { organizeImports } from "../../../src/main/formatting/organize-imports";

const ALIASES = ["@renderer/", "@main/"];

function organize(source: string, file = "src/example.ts") {
	return organizeImports(source, file, ALIASES);
}

describe("Organize imports", () => {
	it("groups builtins, packages, aliases, then relative paths", () => {
		const source = [
			'import { Panel } from "./Panel";',
			'import prettier from "prettier";',
			'import path from "node:path";',
			'import { translation } from "@renderer/i18n/translation";',
			"",
			"export const x = 1;",
			"",
		].join("\n");

		expect(organize(source)).toBe(
			[
				'import path from "node:path";',
				"",
				'import prettier from "prettier";',
				"",
				'import { translation } from "@renderer/i18n/translation";',
				"",
				'import { Panel } from "./Panel";',
				"",
				"export const x = 1;",
				"",
			].join("\n"),
		);
	});

	it("counts an unprefixed builtin as a builtin, and a scoped package as a package", () => {
		const source = [
			'import clsx from "clsx";',
			'import fs from "fs";',
			'import { Terminal } from "@xterm/xterm";',
		].join("\n");

		expect(organize(source)).toBe(
			[
				'import fs from "fs";',
				"",
				'import { Terminal } from "@xterm/xterm";',
				'import clsx from "clsx";',
			].join("\n"),
		);
	});

	it("sorts parent paths ahead of sibling paths", () => {
		const source = [
			'import { b } from "./b";',
			'import { a } from "../../a";',
			'import { c } from "../c";',
		].join("\n");

		expect(organize(source)).toBe(
			['import { a } from "../../a";', 'import { c } from "../c";', 'import { b } from "./b";'].join(
				"\n",
			),
		);
	});

	it("keeps a multi-line import whole", () => {
		const source = [
			'import { z } from "./z";',
			"import {",
			"  loadWallLayout,",
			"  saveWallLayout",
			'} from "./layout";',
		].join("\n");

		expect(organize(source)).toBe(
			[
				"import {",
				"  loadWallLayout,",
				"  saveWallLayout",
				'} from "./layout";',
				'import { z } from "./z";',
			].join("\n"),
		);
	});

	it("carries a comment along with the import it sits above", () => {
		const source = [
			'import { b } from "./b";',
			"// why this one is here",
			'import { a } from "./a";',
		].join("\n");

		expect(organize(source)).toBe(
			["// why this one is here", 'import { a } from "./a";', 'import { b } from "./b";'].join("\n"),
		);
	});

	it("leaves a file header comment at the top", () => {
		const source = [
			"// Copyright someone",
			"",
			'import { b } from "./b";',
			'import { a } from "./a";',
		].join("\n");

		expect(organize(source)).toBe(
			["// Copyright someone", "", 'import { a } from "./a";', 'import { b } from "./b";'].join("\n"),
		);
	});

	it("never moves an import past a side-effect import", () => {
		const source = [
			'import { b } from "./b";',
			'import "./styles.css";',
			'import { z } from "./z";',
			'import { a } from "./a";',
		].join("\n");

		expect(organize(source)).toBe(
			[
				'import { b } from "./b";',
				'import "./styles.css";',
				'import { a } from "./a";',
				'import { z } from "./z";',
			].join("\n"),
		);
	});

	it("keeps a directive above the imports", () => {
		const source = ['"use client";', "", 'import { b } from "./b";', 'import { a } from "./a";'];

		expect(organize(source.join("\n"))).toBe(
			['"use client";', "", 'import { a } from "./a";', 'import { b } from "./b";'].join("\n"),
		);
	});

	it("stops at the first statement that is not an import", () => {
		const source = [
			'import { b } from "./b";',
			'import { a } from "./a";',
			"",
			"const value = 1;",
			'import { late } from "./late";',
		].join("\n");

		expect(organize(source)).toBe(
			[
				'import { a } from "./a";',
				'import { b } from "./b";',
				"",
				"const value = 1;",
				'import { late } from "./late";',
			].join("\n"),
		);
	});

	it("returns the source untouched when the imports are already in order", () => {
		const source = ['import { a } from "./a";', 'import { b } from "./b";', ""].join("\n");

		expect(organize(source)).toBe(source);
	});

	it("leaves files it cannot reason about alone", () => {
		const source = ['import { b } from "./b";', 'import { a } from "./a";'].join("\n");

		expect(organizeImports(source, "styles.css", ALIASES)).toBe(source);
		expect(organizeImports(source, "data.json", ALIASES)).toBe(source);
	});

	it("loses nothing it was given", () => {
		const source = [
			"#!/usr/bin/env node",
			'import { b } from "./b";',
			'import { a } from "./a";',
			"",
			"run();",
		].join("\n");

		const organized = organize(source);

		["#!/usr/bin/env node", './b";', './a";', "run();"].forEach((fragment) => {
			expect(organized).toContain(fragment);
		});
	});
});
