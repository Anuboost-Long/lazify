import fs from "node:fs";
import path from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Electron's main-imports check, for Lazify Chain's rule (AGENTS.md): only
 * `src/platform/` calls `@chain/sdk`, and nothing in the window reaches for
 * Node, Electron or Tauri directly. Type imports are erased before the bundler
 * sees them, so they don't count.
 */

const SRC = path.resolve(__dirname, "../../src");
const NATIVE = /^(node:|electron$|fs$|path$|os$|child_process$|@tauri-apps\/)/;

function sourceFiles(directory: string): string[] {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(directory, entry.name);
		if (entry.isDirectory()) return sourceFiles(full);
		return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts") ? [full] : [];
	});
}

/** Every module a file loads at runtime: value imports, re-exports and import() calls. */
function runtimeImports(file: string): string[] {
	const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
	const found: string[] = [];

	const visit = (node: ts.Node) => {
		if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier)) {
			const named = node.importClause?.namedBindings;
			const onlyTypes =
				!node.importClause?.name &&
				named !== undefined &&
				ts.isNamedImports(named) &&
				named.elements.length > 0 &&
				named.elements.every((element) => element.isTypeOnly);
			if (!onlyTypes) found.push(node.moduleSpecifier.text);
		}
		if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
			found.push(node.moduleSpecifier.text);
		}
		if (
			ts.isCallExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ImportKeyword &&
			node.arguments[0] &&
			ts.isStringLiteral(node.arguments[0])
		) {
			found.push(node.arguments[0].text);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);

	return found;
}

const files = sourceFiles(SRC).map((file) => ({ file: path.relative(SRC, file), imports: runtimeImports(file) }));

describe("what the window's code may load", () => {
	it("calls @chain/sdk only from src/platform", () => {
		const outside = files
			.filter(({ file, imports }) => !file.startsWith(`platform${path.sep}`) && imports.includes("@chain/sdk"))
			.map(({ file }) => file);

		expect(outside).toEqual([]);
	});

	it("never loads Node, Electron or Tauri directly", () => {
		const native = files.flatMap(({ file, imports }) =>
			imports.filter((specifier) => NATIVE.test(specifier)).map((specifier) => `${file} → ${specifier}`),
		);

		expect(native).toEqual([]);
	});

	it("reads the files it checks (a guard against checking nothing)", () => {
		expect(files.length).toBeGreaterThan(300);
		expect(files.find(({ file }) => file === path.join("platform", "lazify.ts"))?.imports).toContain("./updates");
	});
});
