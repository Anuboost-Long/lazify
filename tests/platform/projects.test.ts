import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { nodeFolders } from "./node-folders";

const calls = { list: 0, stat: 0 };

vi.mock("@chain/sdk", () => ({
	desktop: {
		folders: {
			...nodeFolders,
			list: (...args: Parameters<typeof nodeFolders.list>) => {
				calls.list += 1;
				return nodeFolders.list(...args);
			},
			stat: (target: string) => {
				calls.stat += 1;
				return nodeFolders.stat(target);
			},
		},
	},
}));

const { searchProject } = await import("@/platform/projects");
const { searchProject: searchWithoutSnapshot } = await import("@/shared/lib/projects/project-search");

let root: string;

const write = (relative: string, contents: string) => {
	fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
	fs.writeFileSync(path.join(root, relative), contents);
};

beforeEach(() => {
	root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-search-")));
	write(".gitignore", "build/\n");
	write("src/a.ts", "const needle = 1;\n");
	write("src/deep/b.ts", "// needle here\nnothing\nneedle again\n");
	write("src/deep/.gitignore", "*.gen.ts\n");
	write("src/deep/c.gen.ts", "needle in a generated file\n");
	write("build/out.js", "needle in build output\n");
	write("node_modules/pkg/index.js", "needle in a dependency\n");
	for (let index = 0; index < 30; index += 1) write(`docs/section-${index}/page.md`, "no match\n");
	calls.list = 0;
	calls.stat = 0;
});

afterEach(() => {
	fs.rmSync(root, { recursive: true, force: true });
});

const query = { query: "needle", caseSensitive: false, wholeWord: false, regex: false, include: "", exclude: "" };

describe("platform searchProject", () => {
	it("returns exactly what the unwrapped search returns", async () => {
		const wrapped = await searchProject(root, query as never);
		const unwrapped = await searchWithoutSnapshot(root, query as never);

		expect(wrapped).toEqual(unwrapped);
		expect(wrapped.files.map((file) => file.relativePath).sort()).toEqual(["src/a.ts", "src/deep/b.ts", "src/deep/c.gen.ts"]);
	});

	it("lists the project once instead of once per folder", async () => {
		await searchWithoutSnapshot(root, query as never);
		const unwrapped = { ...calls };
		calls.list = 0;
		calls.stat = 0;

		await searchProject(root, query as never);

		expect(unwrapped.list).toBeGreaterThan(30);
		expect(calls).toEqual({ list: 1, stat: 0 });
	});

	it("falls back to plain reads when the path can't be listed", async () => {
		const missing = path.join(root, "missing");

		await expect(searchProject(missing, query as never)).resolves.toEqual(
			await searchWithoutSnapshot(missing, query as never),
		);
	});
});
