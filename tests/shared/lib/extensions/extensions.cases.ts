/**
 * Shared by the extensions golden test and its Electron recorder
 * (docs/rewrite/scripts/extensions-recorder), so both run the same steps
 * against the same fake Open VSX and Java. No app imports: the recorder has
 * no `@/` alias.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { vi } from "vitest";

export interface ExtensionsApi {
	list: (refresh?: boolean) => Promise<unknown>;
	beginInstall: (id: string) => unknown;
	jobs: () => unknown;
	remove: (id: string) => Promise<unknown>;
	toggle: (id: string, enabled: boolean) => Promise<unknown>;
	writeManifest: (projectPath: string) => Promise<string | null>;
	refreshManifests: () => Promise<void>;
}

/** What the fakes answer, set per case. */
export const world = {
	registry: "latest" as "latest" | "error-status" | "offline",
	java: true,
};

const RELEASES: Record<string, string> = {
	"bradlc/vscode-tailwindcss": "0.16.0",
	"SonarSource/sonarlint-vscode": "6.1.0",
};

/** Open VSX for one URL: status and body, or a thrown network error. */
export function openVsx(url: string): { status: number; body: unknown } {
	if (world.registry === "offline") throw new TypeError("fetch failed");
	if (world.registry === "error-status") return { status: 503, body: { error: "unavailable" } };

	const key = url.replace("https://open-vsx.org/api/", "");
	const version = RELEASES[key];

	if (!version) return { status: 404, body: {} };

	return {
		status: 200,
		body: {
			version,
			license: "MIT",
			timestamp: "2026-09-01T00:00:00Z",
			files: { download: `https://open-vsx.org/api/${key}/${version}/file/x.vsix` },
		},
	};
}

export const javaRuntime = () => (world.java ? { path: "/jdk/bin/java", major: 21 } : null);

interface Folders {
	base: string;
	/** `<data>/extensions` */
	extensions: string;
}

type Step = (api: ExtensionsApi, folders: Folders) => Promise<unknown>;

export interface ExtensionsCase {
	name: string;
	registry?: typeof world.registry;
	java?: boolean;
	steps: Step[];
}

const TAILWIND = "bradlc.vscode-tailwindcss";
const SONAR = "SonarSource.sonarlint-vscode";

async function install(folders: Folders, id: string, version: string, enabled = true) {
	const record = path.join(folders.extensions, "installed.json");
	const current = await fs.readFile(record, "utf8").then((text) => JSON.parse(text) as object, () => ({}));

	await fs.mkdir(path.join(folders.extensions, id, version, "extension", "dist"), { recursive: true });
	await fs.writeFile(path.join(folders.extensions, id, version, "extension", "dist", "tailwindServer.js"), "");
	await fs.writeFile(record, JSON.stringify({ ...current, [id]: { version, enabled, installedAt: "2026-01-01T00:00:00.000Z" } }));

	return "installed";
}

const tree = async (root: string) =>
	(await fs.readdir(root, { recursive: true }).catch(() => [] as string[])).map(String).sort();

async function project(base: string, name: string, repo: boolean) {
	const root = path.join(base, name);

	await fs.mkdir(root, { recursive: true });
	if (repo) await fs.mkdir(path.join(root, ".git"), { recursive: true });
	if (repo) await fs.writeFile(path.join(root, ".gitignore"), "node_modules");

	return root;
}

async function manifestOf(root: string) {
	return {
		manifest: await fs.readFile(path.join(root, ".lazify", "extensions.json"), "utf8").catch(() => null),
		gitignore: await fs.readFile(path.join(root, ".gitignore"), "utf8").catch(() => null),
	};
}

export const EXTENSIONS_CASES: ExtensionsCase[] = [
	{ name: "nothing installed, Open VSX reachable", steps: [(api) => api.list(true)] },
	{ name: "Open VSX answers with an error", registry: "error-status", steps: [(api) => api.list(true)] },
	{ name: "Open VSX can't be reached", registry: "offline", steps: [(api) => api.list(true)] },
	{
		name: "installed, current and outdated",
		steps: [
			(_api, folders) => install(folders, TAILWIND, "0.15.0"),
			(_api, folders) => install(folders, SONAR, "6.1.0"),
			(api) => api.list(true),
		],
	},
	{
		name: "no Java: SonarLint says so and won't install",
		java: false,
		steps: [(api) => api.list(true), async (api) => api.beginInstall(SONAR), async (api) => api.jobs()],
	},
	{
		name: "an unknown extension",
		steps: [async (api) => api.beginInstall("someone.else")],
	},
	{
		name: "switched off and on, and switching one that isn't installed",
		steps: [
			(_api, folders) => install(folders, TAILWIND, "0.16.0"),
			(api) => api.toggle(TAILWIND, false),
			(api) => api.toggle(TAILWIND, true),
			(api) => api.toggle(SONAR, false),
		],
	},
	{
		name: "removed",
		steps: [
			(_api, folders) => install(folders, TAILWIND, "0.16.0"),
			(api) => api.remove(TAILWIND),
			async (_api, folders) => tree(folders.extensions),
		],
	},
	{
		name: "the project manifest, in a repository and out of one",
		steps: [
			(_api, folders) => install(folders, TAILWIND, "0.16.0"),
			async (api, { base }) => api.writeManifest(await project(base, "repo", true)),
			async (_api, { base }) => manifestOf(path.join(base, "repo")),
			async (api, { base }) => api.writeManifest(path.join(base, "repo")),
			async (_api, { base }) => manifestOf(path.join(base, "repo")),
			async (api, { base }) => api.writeManifest(await project(base, "plain", false)),
			async (_api, { base }) => manifestOf(path.join(base, "plain")),
			async (api, { base }) => api.writeManifest(path.join(base, "missing")),
		],
	},
	{
		name: "a written manifest follows a toggle",
		steps: [
			(_api, folders) => install(folders, TAILWIND, "0.16.0"),
			async (api, { base }) => api.writeManifest(await project(base, "watched", true)),
			(api) => api.toggle(TAILWIND, false),
			(api) => api.refreshManifests(),
			async (_api, { base }) => manifestOf(path.join(base, "watched")),
		],
	},
];

const START = Date.parse("2026-10-14T00:00:00.000Z");

export async function runExtensionsCase(testCase: ExtensionsCase, api: ExtensionsApi, folders: Folders) {
	world.registry = testCase.registry ?? "latest";
	world.java = testCase.java ?? true;
	await fs.rm(folders.extensions, { recursive: true, force: true });
	for (const name of ["repo", "plain", "watched"]) await fs.rm(path.join(folders.base, name), { recursive: true, force: true });

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

	return JSON.parse(JSON.stringify(results).replaceAll(folders.base, "<base>"));
}
