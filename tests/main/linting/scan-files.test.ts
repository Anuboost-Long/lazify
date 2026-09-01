import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BATCH_SIZE, collectScanFiles } from "../../../src/main/linting/scan/source-files";

/**
 * A scan reads what the project keeps, wherever it keeps it. Anything git was
 * told to ignore — installed packages, build output, local caches — stays out,
 * and so does node_modules whether the repo ignores it or not.
 */

let projectPath = "";

const write = (relativePath: string, contents = "export const value = 1;\n") => {
	const filePath = path.join(projectPath, relativePath);

	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, contents);
};

const git = (...args: string[]) => execFileSync("git", args, { cwd: projectPath, stdio: "ignore" });

const initRepo = () => {
	git("init", "--quiet");
	git("config", "user.email", "scan@test.local");
	git("config", "user.name", "Scan Test");
};

const scanned = () =>
	collectScanFiles(projectPath).files.map((filePath) =>
		path.relative(projectPath, filePath).split(path.sep).join("/"),
	);

beforeEach(() => {
	projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-scan-files-"));
});

afterEach(() => {
	fs.rmSync(projectPath, { recursive: true, force: true });
});

describe("collectScanFiles", () => {
	it("reads the whole project, not only the folders code usually sits in", () => {
		initRepo();
		write("src/features/Panel.tsx");
		write("scripts/tool.ts");
		write("docs/notes.md");
		write("infra/main.tf");

		expect(scanned()).toEqual([
			"docs/notes.md",
			"infra/main.tf",
			"scripts/tool.ts",
			"src/features/Panel.tsx",
		]);
		expect(collectScanFiles(projectPath).roots).toEqual(["docs", "infra", "scripts", "src"]);
	});

	it("leaves out what the repository ignores", () => {
		initRepo();
		write(".gitignore", "dist/\n.cache/\nsecret.ts\n");
		write("src/Panel.tsx");
		write("dist/Panel.tsx");
		write(".cache/Panel.tsx");
		write("secret.ts");

		expect(scanned()).toEqual(["src/Panel.tsx"]);
	});

	it("never reads an installed package, ignored or not", () => {
		initRepo();
		write("src/Panel.tsx");
		write("node_modules/pkg/Widget.tsx");
		git("add", "--force", "node_modules/pkg/Widget.tsx");

		expect(scanned()).toEqual(["src/Panel.tsx"]);
	});

	it("walks a project that is not a git checkout, skipping the usual output", () => {
		write("components/Panel.tsx");
		write("node_modules/pkg/Widget.tsx");
		write("dist/Panel.tsx");

		expect(scanned()).toEqual(["components/Panel.tsx"]);
		expect(collectScanFiles(projectPath).roots).toEqual(["components"]);
	});

	it("reads one batch at a time, and resumes from the cursor it was handed", () => {
		initRepo();
		for (let index = 0; index < 1200; index += 1) {
			write(`src/module-${String(index).padStart(4, "0")}.ts`);
		}

		const first = collectScanFiles(projectPath);
		expect(first.files).toHaveLength(BATCH_SIZE);
		expect(first.batch).toEqual({ start: 1, end: BATCH_SIZE, total: 1200 });
		expect(first.nextCursor).toBe("src/module-1000.ts");

		const second = collectScanFiles(projectPath, first.nextCursor);
		expect(second.files).toHaveLength(200);
		expect(second.batch).toEqual({ start: 1001, end: 1200, total: 1200 });
		expect(second.nextCursor).toBeNull();
	});

	it("starts over when a cursor points past the files that are left", () => {
		initRepo();
		write("src/Panel.tsx");

		expect(collectScanFiles(projectPath, "src/zzz-gone.ts").files).toHaveLength(1);
	});

	it("leaves the tests out, in their own folder or beside the code", () => {
		initRepo();
		write("src/Panel.tsx");
		write("src/Panel.test.tsx");
		write("src/helpers.spec.ts");
		write("tests/renderer/panel.tsx");
		write("__tests__/Panel.tsx");
		write("e2e/checkout.ts");

		expect(scanned()).toEqual(["src/Panel.tsx"]);
	});

	it("leaves the tests out of a project that is not a git checkout too", () => {
		write("src/Panel.tsx");
		write("src/Panel.test.tsx");
		write("tests/panel.tsx");

		expect(scanned()).toEqual(["src/Panel.tsx"]);
	});

	it("passes over a file no engine can analyse", () => {
		initRepo();
		write("src/Panel.tsx");
		write("assets/logo.png", "binary");
		write("notes.txt", "text");

		expect(scanned()).toEqual(["src/Panel.tsx"]);
	});
});
