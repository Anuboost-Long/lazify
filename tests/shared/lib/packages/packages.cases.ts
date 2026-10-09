/**
 * Shared by the golden test and its Electron recorder
 * (docs/rewrite/scripts/packages-recorder), so both run the same scenarios
 * against the same fakes. No app imports: the recorder has no `@/` alias.
 */

export type ExecReply = { stdout: string } | { fail: string; stdout?: string };

const VERSIONS: Record<string, string> = { node: "v22.12.0", npm: "10.9.0", yarn: "1.22.22", npx: "10.9.0" };

const OUTDATED_ISSUES = JSON.stringify({
	react: { current: "18.2.0", wanted: "18.3.1", latest: "19.1.0", dependent: "app", location: "node_modules/react" },
});

const AUDIT_ISSUES = JSON.stringify({
	vulnerabilities: {
		lodash: { name: "lodash", severity: "high", isDirect: true, via: ["Prototype Pollution"], range: "<4.17.21", fixAvailable: true },
	},
	metadata: {
		vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0, total: 1 },
		dependencies: { prod: 3, dev: 1, optional: 0, peer: 0, peerOptional: 0, total: 4 },
	},
});

const CLI_SEARCH = JSON.stringify([
	{ name: "left-pad", version: "1.3.0", description: "String left pad", keywords: "pad, string", author: { name: "azer" } },
	{ name: "pad-left", version: "2.1.0", keywords: ["pad"], maintainers: [{ username: "jon" }] },
]);

function npmHealthReply(check: "outdated" | "audit", scenario: string): ExecReply {
	if (scenario === "clean") return { stdout: "{}" };
	if (scenario === "issues") return { fail: "npm exited with code 1", stdout: check === "outdated" ? OUTDATED_ISSUES : AUDIT_ISSUES };
	if (scenario === "npm-error") {
		return { fail: "npm exited with code 1", stdout: JSON.stringify({ error: { code: "ELOCKVERIFY", summary: "Lockfile is out of date" } }) };
	}
	return { fail: "spawn npm ENOENT" };
}

/** `cwd`'s last folder names the npm scenario; `search`'s query names the CLI one. */
export function execReply(command: string, args: string[], cwd = ""): ExecReply {
	if (args[0] === "--version" && command in VERSIONS) return { stdout: `${VERSIONS[command]}\n` };

	if (command === "npm" && (args[0] === "outdated" || args[0] === "audit")) {
		return npmHealthReply(args[0], cwd.slice(cwd.lastIndexOf("/") + 1));
	}

	if (command === "npm" && args[0] === "search") {
		return args[1] === "fallback" ? { stdout: CLI_SEARCH } : { fail: "npm search failed" };
	}

	return { fail: `unexpected ${command} ${args.join(" ")}` };
}

export const NPM_SCENARIOS = ["clean", "issues", "npm-error", "crash"];

export type RegistryReply = { status: number; body: unknown } | "offline";

export function registryReply(url: string): RegistryReply {
	const query = new URL(url).searchParams.get("text");
	if (query === "react") {
		return {
			status: 200,
			body: {
				objects: [
					{ package: { name: "react", version: "19.1.0", description: "React", keywords: ["ui"], publisher: { username: "fb" } } },
					{ package: { name: "react-dom", version: "19.1.0" } },
				],
			},
		};
	}
	if (query === "fallback") return { status: 500, body: {} };
	return "offline";
}

export const SEARCH_QUERIES = ["react", "  fallback  ", "offline", "a"];

export interface WorkflowCase {
	name: string;
	lock: "npm" | "yarn" | null;
	/** One entry per command the runner is asked to run, in order. */
	results: boolean[];
	call:
		| { fn: "addProjectPackage"; payload: { packageName: string; dev?: boolean } }
		| { fn: "removeProjectPackage"; payload: { packageName: string } }
		| { fn: "installProjectDependencies" }
		| { fn: "installPackage"; payload: { packageName: string } };
	/** Point the workflow at a folder that does not exist. */
	missing?: boolean;
}

export const WORKFLOW_CASES: WorkflowCase[] = [
	{ name: "add, npm, succeeds", lock: "npm", results: [true], call: { fn: "addProjectPackage", payload: { packageName: "zod" } } },
	{ name: "add dev, npm, auto-fix succeeds", lock: "npm", results: [false, true], call: { fn: "addProjectPackage", payload: { packageName: "vitest", dev: true } } },
	{ name: "add dev, yarn, auto-fix fails", lock: "yarn", results: [false, false], call: { fn: "addProjectPackage", payload: { packageName: "vitest", dev: true } } },
	{ name: "add, no lockfile", lock: null, results: [true], call: { fn: "addProjectPackage", payload: { packageName: "zod" } } },
	{ name: "add, missing project", lock: null, results: [], call: { fn: "addProjectPackage", payload: { packageName: "zod" } }, missing: true },
	{ name: "remove, npm, succeeds", lock: "npm", results: [true], call: { fn: "removeProjectPackage", payload: { packageName: "zod" } } },
	{ name: "remove, yarn, fails", lock: "yarn", results: [false], call: { fn: "removeProjectPackage", payload: { packageName: "zod" } } },
	{ name: "install, npm, legacy retry", lock: "npm", results: [false, true], call: { fn: "installProjectDependencies" } },
	{ name: "install, yarn, fails without retry", lock: "yarn", results: [false], call: { fn: "installProjectDependencies" } },
	{ name: "install packages, two at once", lock: "npm", results: [true], call: { fn: "installPackage", payload: { packageName: "react@18.3.1, react-dom@18.3.1" } } },
	{ name: "install packages, missing project", lock: null, results: [], call: { fn: "installPackage", payload: { packageName: "zod" } }, missing: true },
];

export interface RecordedCommand {
	command: string;
	args: string[];
	cwd?: string;
}

/** A command runner that answers from `results` and keeps what it was asked. */
export function fakeRunner(results: boolean[]) {
	const calls: RecordedCommand[] = [];
	const queue = [...results];

	return {
		calls,
		runner: {
			runCommand: async ({ command, args, cwd }: RecordedCommand) => {
				calls.push({ command, args, cwd });
				const success = queue.shift() ?? false;
				return { success, code: success ? 0 : 1, stdout: "", stderr: success ? "" : "boom" };
			},
		},
	};
}

/** Paths and ids that differ per run, made stable for a snapshot. */
export function stable(value: unknown, project: string): unknown {
	return JSON.parse(
		JSON.stringify(value ?? null)
			.replaceAll(project, "<project>")
			.replaceAll(/"workflowId":"([a-z-]+)-\d+"/g, '"workflowId":"$1-<time>"'),
	);
}
