/**
 * Shared by the imported-templates golden test and its Electron recorder
 * (docs/rewrite/scripts/templates-recorder), so both run the same steps
 * against the same projects. No app imports: the recorder has no `@/` alias.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { vi } from "vitest";

import { execReply, fakeRunner, PROJECT_NAME, readTree, stable } from "./creation.cases";

export interface TemplatesApi {
	save: (projectPath: string, included: string[], name?: string | null, stack?: string | null) => Promise<unknown>;
	list: () => Promise<unknown>;
	get: (id: string) => Promise<unknown>;
	update: (id: string, updates: { name?: string | null; tree?: unknown[] | null }) => Promise<unknown>;
	remove: (id: string) => Promise<unknown>;
	createProject: (ctx: never, payload: never) => Promise<unknown>;
}

interface Folders {
	/** Holds the source projects and the workspace. */
	base: string;
	/** The store's `imported-templates` folder. */
	store: string;
}

type Step = (api: TemplatesApi, folders: Folders) => Promise<unknown>;

export interface TemplatesCase {
	name: string;
	steps: Step[];
}

export const execFor = (command: string, args: string[]) => execReply({ name: "", templateId: null }, command, args);

const NUL = "\u0000";

/**
 * A Next project with everything the walk has to decide about. No `react`
 * dependency: Electron counted it as Vite evidence, which ticket 002 changed
 * on purpose, and stack detection has its own fixture.
 */
const SHOP_FILES: Record<string, string> = {
	"package.json": `${JSON.stringify({ name: "shop", dependencies: { next: "15.0.0" } }, null, 2)}\n`,
	"package-lock.json": "{}\n",
	"next.config.js": "module.exports = {};\n",
	".gitignore": "# logs\n*.log\n!keep.log\nsecret/\n/root-only.ts\n",
	".env": "TOKEN=1\n",
	".env.local": "TOKEN=2\n",
	".DS_Store": "x",
	"README.md": "﻿# Shop\n",
	"debug.log": "noise\n",
	"keep.log": "kept\n",
	"root-only.ts": "export {};\n",
	"notes.txt": "plain notes\n",
	"secret/key.ts": "export const key = 1;\n",
	"app/page.tsx": "export default function Page() { return null; }\n",
	"app/layout.tsx": "export default function Layout() { return null; }\n",
	"app/(tabs)/home.tsx": "export default function Home() { return null; }\n",
	"app/root-only.ts": "export {};\n",
	"components/Button.tsx": "export const Button = () => null;\n",
	"components/Item10.tsx": "export {};\n",
	"components/Item9.tsx": "export {};\n",
	"src/api/client.ts": "export const client = {};\n",
	"src/i18n/en.json": "{}\n",
	"public/logo.png": `PNG${NUL}${NUL}data`,
	"nested/.gitignore": "generated/\n",
	"nested/generated/out.ts": "export {};\n",
	"nested/kept.ts": "export {};\n",
	"node_modules/x/index.js": "module.exports = 1;\n",
	"dist/out.js": "1;\n",
	".git/HEAD": "ref: refs/heads/main\n",
};

/** No stack to detect, and one file over the 50 KB content limit. */
const PLAIN_FILES: Record<string, string> = {
	"big.json": `${JSON.stringify({ data: "x".repeat(60 * 1024) })}\n`,
	"index.ts": "export {};\n",
};

const SHOP_SELECTION = Object.keys(SHOP_FILES).filter((file) => !file.startsWith("node_modules/") && !file.startsWith("dist/"));

async function writeTree(root: string, files: Record<string, string>) {
	for (const [relative, contents] of Object.entries(files)) {
		await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
		await fs.writeFile(path.join(root, relative), contents);
	}
}

const shop = ({ base }: Folders) => path.join(base, "shop");
const plain = ({ base }: Folders) => path.join(base, "plain");
const workspace = ({ base }: Folders) => path.join(base, "workspace");

function createPayload(folders: Folders, importedTemplateId: string | null, structureTree: unknown[] = []) {
	return {
		name: PROJECT_NAME,
		baseDirectory: workspace(folders),
		sourceMode: "imported",
		templateId: null,
		importedTemplateId,
		structureTree,
	} as never;
}

/** Creates the project and reports what was run, what was said and what landed. */
async function create(api: TemplatesApi, folders: Folders, importedTemplateId: string | null, options: { results?: boolean[]; structureTree?: unknown[] } = {}) {
	const { calls, runner } = fakeRunner(options.results);
	const progress: unknown[] = [];
	const ctx = { commandRunner: runner, emitProgress: (event: unknown) => progress.push(event) } as never;
	const outcome = await api.createProject(ctx, createPayload(folders, importedTemplateId, options.structureTree));

	return { outcome, calls, progress, project: await readTree(path.join(workspace(folders), PROJECT_NAME)) };
}

const customFile = (name: string, content: string) => ({ id: `custom-${name}`, name, type: "file", source: "custom", locked: false, content, children: [] });

export const TEMPLATES_CASES: TemplatesCase[] = [
	{
		name: "save a whole Next project, then list it",
		steps: [(api, folders) => api.save(shop(folders), SHOP_SELECTION, "Shop starter"), (api) => api.list()],
	},
	{
		name: "save a partial selection under default names",
		steps: [
			(api, folders) => api.save(shop(folders), ["app/page.tsx", "./components/Button.tsx", "src/api/client.ts"]),
			(api, folders) => api.save(shop(folders), ["package.json"], "   "),
			(api) => api.list(),
		],
	},
	{
		name: "a taken id gets a number, and a name with no letters a fallback id",
		steps: [
			(api, folders) => api.save(shop(folders), ["package.json"], "Shop"),
			(api, folders) => api.save(shop(folders), ["package.json"], "shop"),
			(api, folders) => api.save(shop(folders), ["package.json"], "!!!"),
			(api) => api.list(),
		],
	},
	{
		name: "a confirmed stack that matches, and one that differs",
		steps: [
			(api, folders) => api.save(shop(folders), ["package.json"], "Same", "react-next"),
			(api, folders) => api.save(shop(folders), ["package.json"], "Other", "react-vite"),
		],
	},
	{
		name: "a large file is kept as a reference, in a project with no stack",
		steps: [(api, folders) => api.save(plain(folders), ["big.json", "index.ts"], "Plain")],
	},
	{
		name: "saving from a file, not a folder",
		steps: [(api, folders) => api.save(path.join(shop(folders), "package.json"), ["package.json"], "Nope")],
	},
	{
		name: "missing templates",
		steps: [(api) => api.get("nope"), (api) => api.remove("nope"), (api) => api.update("nope", { name: "x" })],
	},
	{
		name: "rename, edit the tree, then a blank name keeps it",
		steps: [
			(api, folders) => api.save(shop(folders), ["app/page.tsx", "components/Button.tsx"], "Editable"),
			(api) =>
				api.update("editable", {
					name: "  Renamed  ",
					tree: [
						{ id: "f-components", name: "components", type: "folder", source: "custom", locked: false, children: [customFile("Card.tsx", "export {};\n")] },
						customFile("auth.ts", "export {};\n"),
					],
				}),
			(api) => api.update("editable", { name: "   ", tree: null }),
			(api) => api.list(),
		],
	},
	{
		name: "delete",
		steps: [
			(api, folders) => api.save(shop(folders), ["package.json"], "Doomed"),
			(api) => api.remove("doomed"),
			(api) => api.list(),
			(api) => api.get("doomed"),
		],
	},
	{
		name: "templates saved by an older Lazify",
		steps: [
			async (_api, { store }) => {
				await fs.mkdir(store, { recursive: true });
				await fs.writeFile(
					path.join(store, "legacy.json"),
					JSON.stringify({
						id: "legacy",
						name: "Legacy",
						savedAt: "2025-01-02T03:04:05.000Z",
						tree: [
							{ id: "src", name: "src", type: "folder", source: "custom", locked: false, children: [customFile("index.ts", "export {};\n")] },
						],
					}),
				);
				await fs.writeFile(path.join(store, "bare.json"), "{}");
				await fs.writeFile(path.join(store, "notes.md"), "not a template");
				await fs.mkdir(path.join(store, "folder.json"));
				return "written";
			},
			(api) => api.list(),
			(api) => api.get("legacy"),
		],
	},
	{
		name: "a template file that isn't JSON",
		steps: [
			async (_api, { store }) => {
				await fs.mkdir(store, { recursive: true });
				await fs.writeFile(path.join(store, "broken.json"), "{ nope");
				return "written";
			},
			(api) => api.list(),
			(api) => api.get("broken"),
		],
	},
	{
		name: "create a project from a template, installing its dependencies",
		steps: [
			(api, folders) => api.save(shop(folders), ["package.json", "app/page.tsx", "components/Button.tsx", "public/logo.png"], "Shop"),
			(api, folders) => create(api, folders, "shop"),
		],
	},
	{
		name: "create a project, install fails",
		steps: [
			(api, folders) => api.save(shop(folders), ["package.json", "app/page.tsx"], "Shop"),
			(api, folders) => create(api, folders, "shop", { results: [false] }),
		],
	},
	{
		name: "create a project from a template with no package.json",
		steps: [
			(api, folders) => api.save(shop(folders), ["app/page.tsx", "nested/kept.ts"], "No manifest"),
			(api, folders) => create(api, folders, "no-manifest"),
		],
	},
	{
		name: "create into an existing folder: merges package.json, replaces scaffold roots",
		steps: [
			async (_api, folders) => {
				await writeTree(path.join(workspace(folders), PROJECT_NAME), {
					"package.json": `${JSON.stringify({ name: "mine", scripts: { dev: "vite" }, dependencies: { react: "18.0.0" } })}\n`,
					"components/Stale.tsx": "stale\n",
					"nested/mine.ts": "mine\n",
				});
				return "written";
			},
			(api, folders) => api.save(shop(folders), ["package.json", "components/Button.tsx", "nested/kept.ts"], "Shop"),
			(api, folders) => create(api, folders, "shop"),
		],
	},
	{
		name: "create from the tree the user edited, not the stored one",
		steps: [
			(api, folders) => api.save(shop(folders), ["app/page.tsx"], "Shop"),
			(api, folders) => create(api, folders, "shop", { structureTree: [customFile("only.ts", "export {};\n")] }),
		],
	},
	{
		name: "create with no template chosen, and with one that is gone",
		steps: [(api, folders) => create(api, folders, null), (api, folders) => create(api, folders, "gone")],
	},
];

const START = Date.parse("2026-10-14T00:00:00.000Z");

/**
 * Runs one case's steps a second apart on a fixed clock, so `savedAt` and the
 * newest-first order are the same on both sides.
 */
export async function runTemplatesCase(testCase: TemplatesCase, api: TemplatesApi, folders: Folders) {
	await fs.rm(folders.store, { recursive: true, force: true });
	await fs.rm(workspace(folders), { recursive: true, force: true });
	await fs.rm(shop(folders), { recursive: true, force: true });
	await fs.rm(plain(folders), { recursive: true, force: true });
	await writeTree(shop(folders), SHOP_FILES);
	await writeTree(plain(folders), PLAIN_FILES);
	await fs.symlink("app/page.tsx", path.join(shop(folders), "page-link.tsx"));
	await fs.mkdir(workspace(folders), { recursive: true });

	vi.useFakeTimers({ toFake: ["Date"] });
	const results: unknown[] = [];

	try {
		for (const [index, step] of testCase.steps.entries()) {
			vi.setSystemTime(START + index * 1000);
			try {
				results.push(await step(api, folders));
			} catch (error) {
				results.push({ threw: (error as Error).message });
			}
		}
	} finally {
		vi.useRealTimers();
	}

	return stable(results, folders.base, folders.base);
}
