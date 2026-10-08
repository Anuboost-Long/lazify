import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface ImporterApi {
	importProjectIndexFromDirectory(projectPath: string): Promise<unknown>;
	readImportedProjectFile(filePath: string): Promise<unknown>;
	createImportedProjectTemplate(projectPath: string, includedRelativePaths: string[]): Promise<unknown>;
	importProjectFromDirectory(projectPath: string): Promise<unknown>;
}

const FILES: Record<string, string> = {
	"package.json": JSON.stringify({ name: "demo", scripts: { build: "tsc" } }, null, 2),
	".gitignore": "dist/\n*.log\n!keep.log\n/root-only.txt\n.env*\n# a comment\n\n",
	".env": "SECRET=1\n",
	".env.local": "SECRET=2\n",
	"README.md": "# Demo\n",
	"root-only.txt": "ignored at the root\n",
	"debug.log": "ignored\n",
	"keep.log": "kept by negation\n",
	"src/index.ts": "export const answer = 42;\n",
	"src/root-only.txt": "not ignored below the root\n",
	"src/components/Button.tsx": "export function Button() { return null; }\n",
	"src/components/.gitignore": "*.snap\n",
	"src/components/Button.snap": "ignored by the nested rule\n",
	"dist/bundle.js": "ignored folder\n",
	"node_modules/pkg/index.js": "always ignored\n",
	".git/HEAD": "ref: refs/heads/main\n",
	"assets/logo.png": "\u0089PNG\u0000\u0000binary",
	"big.txt": "x".repeat(300 * 1024),
	"Zeta.md": "sorted last\n",
	"alpha.md": "sorted first?\n",
};

function makeProject(): string {
	const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "lazify-import-")));

	for (const [relative, contents] of Object.entries(FILES)) {
		fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
		fs.writeFileSync(path.join(root, relative), contents);
	}
	fs.mkdirSync(path.join(root, "empty-folder"));
	fs.symlinkSync(path.join(root, "README.md"), path.join(root, "readme-link.md"));

	return root;
}

const outcome = async (call: () => Promise<unknown>) => {
	try {
		return { value: await call() };
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}
};

export async function exercise(api: ImporterApi): Promise<Record<string, unknown>> {
	const root = makeProject();
	const normalise = (value: unknown) =>
		JSON.parse(
			JSON.stringify(value ?? null)
				.replaceAll(root, "<project>")
				.replaceAll(path.basename(root), "<project-name>"),
		);
	const results: Record<string, unknown> = {};
	const record = async (name: string, call: () => Promise<unknown>) => {
		results[name] = normalise(await outcome(call));
	};

	try {
		await record("index", () => api.importProjectIndexFromDirectory(root));
		await record("index of a file", () => api.importProjectIndexFromDirectory(path.join(root, "README.md")));
		await record("index of a missing folder", () => api.importProjectIndexFromDirectory(path.join(root, "nope")));
		await record("read a text file", () => api.readImportedProjectFile(path.join(root, "src/index.ts")));
		await record("read a binary file", () => api.readImportedProjectFile(path.join(root, "assets/logo.png")));
		await record("read a large file", () => api.readImportedProjectFile(path.join(root, "big.txt")));
		await record("read a folder", () => api.readImportedProjectFile(path.join(root, "src")));
		await record("read a missing file", () => api.readImportedProjectFile(path.join(root, "missing.ts")));
		await record("template of selected files", () =>
			api.createImportedProjectTemplate(root, ["src/index.ts", "./README.md", "src/components/Button.tsx"]),
		);
		await record("template with nothing selected", () => api.createImportedProjectTemplate(root, []));
		await record("full scan", () => api.importProjectFromDirectory(root));
	} finally {
		fs.rmSync(root, { recursive: true, force: true });
	}

	return results;
}
