/**
 * Shared by the golden test and its Electron recorder
 * (docs/rewrite/scripts/creation-recorder), so both run the same scenarios
 * against the same fakes. No app imports: the recorder has no `@/` alias.
 */
import fs from "node:fs/promises";
import path from "node:path";

type Tool = "node" | "npm" | "yarn" | "npx" | "git";

export interface CreationCase {
	name: string;
	templateId: string | null;
	sourceMode?: "stack" | "imported";
	createOptions?: Record<string, boolean>;
	/** Tools that fail `--version`. */
	missing?: Tool[];
	nodeVersion?: string;
	/** What `git clone` does: copy the fixture starter, or fail with this stderr. */
	clone?: "ok" | { stderr: string };
	/** One entry per command the runner is asked to run, in order; true once they run out. */
	results?: boolean[];
	registry?: "offline" | "latest";
	/** Folder under the case's base the project is created in. */
	baseFolder?: string;
	destinationExists?: boolean;
}

export const PROJECT_NAME = "my-app";

export const CREATION_CASES: CreationCase[] = [
	{ name: "starter, succeeds", templateId: "next-default", clone: "ok" },
	{ name: "starter, expo, succeeds", templateId: "expo-default", clone: "ok" },
	{
		name: "starter, offline",
		templateId: "next-default",
		clone: { stderr: "Cloning into 'x'...\nfatal: unable to access 'https://github.com/x/': Could not resolve host: github.com\n" },
	},
	{
		name: "starter, tag missing",
		templateId: "next-default",
		clone: { stderr: "fatal: Remote branch v1.0.0 not found in upstream origin\n" },
	},
	{ name: "starter, clone fails otherwise", templateId: "next-default", clone: { stderr: "fatal: early EOF\n" } },
	{ name: "starter, git missing", templateId: "next-default", missing: ["git"] },
	{ name: "starter, install fails", templateId: "next-default", clone: "ok", results: [false] },
	{ name: "starter, git init fails", templateId: "next-default", clone: "ok", results: [true, false] },
	{ name: "starter, git commit fails", templateId: "next-default", clone: "ok", results: [true, true, true, false] },
	{ name: "starter, destination exists", templateId: "next-default", clone: "ok", destinationExists: true },
	{ name: "cli, vite, latest compatible versions", templateId: "vite-react", registry: "latest" },
	{ name: "cli, vite, registry offline, into a new folder", templateId: "vite-react", registry: "offline", baseFolder: "new/workspace" },
	{ name: "cli, vite, create fails", templateId: "vite-react", results: [false] },
	{ name: "cli, vite, install auto-fix fails", templateId: "vite-react", registry: "offline", results: [true, false, false] },
	{ name: "cli, vite, npm missing uses npx and yarn", templateId: "vite-react", registry: "offline", missing: ["npm"] },
	{ name: "cli, bare react native through npx", templateId: "react-native-bare", registry: "offline" },
	{ name: "cli, vite, nothing to run it with", templateId: "vite-react", missing: ["npm", "npx"] },
	{ name: "no stack chosen", templateId: null },
	{ name: "unknown stack", templateId: "svelte" },
	{ name: "node too old", templateId: "vite-react", nodeVersion: "v16.20.0" },
	{ name: "neither npm nor yarn", templateId: "vite-react", missing: ["npm", "yarn"] },
];

/** A starter as it sits in its repo: history, its own CI, a descriptor, the name token. */
const STARTER_FILES: Record<string, string> = {
	".git/HEAD": "ref: refs/heads/main\n",
	".github/ci.yml": "on: push\n",
	"package.json": `${JSON.stringify({ name: "next-scaffold", version: "0.1.0", dependencies: { next: "15.0.0" } }, null, 2)}\n`,
	"README.md": "# lazify_scaffold\n\nRun lazify_scaffold locally.\n",
	"app/layout.tsx": "<title>__APP_TITLE__</title>\n",
	"app.json": `${JSON.stringify({ expo: { name: "lazify_scaffold", slug: "lazify_scaffold" } })}\n`,
	"starter.json": JSON.stringify({
		substitutions: [
			{ file: "app/layout.tsx", token: "__APP_TITLE__", value: "{{projectName}} app" },
			{ file: "gone.txt", token: "x", value: "y" },
		],
		optionalFolders: [{ path: "app/(marketing)", label: "Marketing pages" }],
		required: ["package.json"],
		excludeFromCopy: [".github"],
	}),
};

async function writeTree(root: string, files: Record<string, string>) {
	for (const [relative, contents] of Object.entries(files)) {
		await fs.mkdir(path.dirname(path.join(root, relative)), { recursive: true });
		await fs.writeFile(path.join(root, relative), contents);
	}
}

const VERSIONS: Record<Tool, string> = { node: "v22.12.0", npm: "10.9.0", yarn: "1.22.22", npx: "10.9.0", git: "git version 2.50.1" };

export type ExecReply = { stdout: string } | { fail: string; stderr: string };

/** What `execFile` answers: tool versions and `git clone`. */
export async function execReply(testCase: CreationCase, command: string, args: string[]): Promise<ExecReply> {
	const tool = command as Tool;

	if (args[0] === "--version" && tool in VERSIONS) {
		if (testCase.missing?.includes(tool)) return { fail: `spawn ${command} ENOENT`, stderr: "" };
		return { stdout: `${tool === "node" ? (testCase.nodeVersion ?? VERSIONS.node) : VERSIONS[tool]}\n` };
	}

	if (command === "git" && args[0] === "clone") {
		const clone = testCase.clone ?? "ok";
		if (clone !== "ok") return { fail: "Command failed: git clone", stderr: clone.stderr };
		await writeTree(args.at(-1) as string, STARTER_FILES);
		return { stdout: "" };
	}

	return { fail: `unexpected ${command} ${args.join(" ")}`, stderr: "" };
}

export interface RecordedCommand {
	command: string;
	args: string[];
	cwd?: string;
}

/**
 * A command runner that answers from `results` and keeps what it was asked. A
 * scaffolder that succeeds leaves a project behind, as the real one would.
 */
export function fakeRunner(results: boolean[] = []) {
	const calls: RecordedCommand[] = [];
	const queue = [...results];

	return {
		calls,
		runner: {
			runCommand: async ({ command, args, cwd }: RecordedCommand) => {
				calls.push({ command, args, cwd });
				const success = queue.shift() ?? true;

				if (success && cwd && args.includes(PROJECT_NAME)) {
					await writeTree(path.join(cwd, PROJECT_NAME), {
						"package.json": `${JSON.stringify({ name: PROJECT_NAME, dependencies: { react: "^18.3.1", axios: "^1.6.0" }, devDependencies: {} }, null, 2)}\n`,
						"src/main.tsx": "export {};\n",
					});
				}

				return { success, code: success ? 0 : 1, stdout: "", stderr: success ? "" : "boom" };
			},
		},
	};
}

export type RegistryReply = { status: number; body: unknown } | "offline";

/** dist-tags say 9.0.0 for everything; react-i18next 9.0.0 wants React 19, so it keeps its pin. */
export function registryReply(testCase: CreationCase, url: string): RegistryReply {
	if (testCase.registry !== "latest") return "offline";
	if (url.includes("/-/package/")) return { status: 200, body: { latest: "9.0.0" } };
	if (url.includes("react-i18next")) return { status: 200, body: { peerDependencies: { react: ">=19" } } };
	return { status: 200, body: { peerDependencies: { react: ">=16.8" } } };
}

/** Every file under `root` with its text, or null when there is no folder. */
export async function readTree(root: string): Promise<Record<string, string> | null> {
	const exists = await fs.stat(root).then(() => true, () => false);
	if (!exists) return null;

	const files: Record<string, string> = {};
	const walk = async (folder: string) => {
		for (const entry of (await fs.readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
			const entryPath = path.join(folder, entry.name);
			if (entry.isDirectory()) await walk(entryPath);
			else files[path.relative(root, entryPath)] = await fs.readFile(entryPath, "utf8");
		}
	};
	await walk(root);

	return files;
}

const escapeRegExp = (text: string) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** `stagingParent` is where the code under test makes its `lazify-project-…` folders. */
const stagingPattern = (stagingParent: string) => new RegExp(`${escapeRegExp(stagingParent)}/lazify-project-[A-Za-z0-9-]+`, "g");

/** Runs one case through `createProject` and returns what the snapshot holds. */
export async function runCase(
	testCase: CreationCase,
	base: string,
	stagingParent: string,
	createProject: (ctx: never, payload: never) => Promise<unknown>,
) {
	const workspace = path.join(base, testCase.baseFolder ?? "");
	const destination = path.join(workspace, PROJECT_NAME);
	if (testCase.destinationExists) await writeTree(destination, { "keep.txt": "mine\n" });

	const { calls, runner } = fakeRunner(testCase.results);
	const progress: unknown[] = [];
	const ctx = { commandRunner: runner, emitProgress: (event: unknown) => progress.push(event) } as never;

	let outcome: unknown;
	try {
		outcome = await createProject(ctx, {
			name: PROJECT_NAME,
			baseDirectory: workspace,
			sourceMode: testCase.sourceMode ?? "stack",
			templateId: testCase.templateId,
			importedTemplateId: null,
			structureTree: [],
			createOptions: testCase.createOptions,
		} as never);
	} catch (error) {
		outcome = { threw: (error as Error).message };
	}

	const seen = [...calls.map((call) => call.cwd ?? ""), JSON.stringify(progress)].join("\n");
	const staging = new RegExp(stagingPattern(stagingParent).source).exec(seen)?.[0];
	const stagingLeft = staging ? await fs.stat(staging).then(() => true, () => false) : null;

	return stable({ calls, progress, outcome, project: await readTree(destination), stagingLeft }, base, stagingParent);
}

/** Paths and ids that differ per run, made stable for a snapshot. */
export function stable(value: unknown, base: string, stagingParent: string): unknown {
	return JSON.parse(
		JSON.stringify(value ?? null)
			.replaceAll(stagingPattern(stagingParent), "<staging>")
			.replaceAll(base, "<base>")
			.replaceAll(/"workflowId":"([a-z-]+)-\d+"/g, '"workflowId":"$1-<time>"'),
	);
}
