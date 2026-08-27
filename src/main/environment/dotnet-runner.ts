import fs from "node:fs/promises";
import path from "node:path";

import { detectDotnetProject } from "../../brain";
import { isPortFree } from "./dev-port";

/**
 * Makes a .NET project runnable through the same Scripts pane as a Node one.
 *
 * .NET has no package.json scripts, so the verbs are synthesised from the
 * project file and namespaced with `dotnet:` — that keeps them from colliding
 * with a real script in a repo that has both a package.json and a `.csproj`,
 * and gives `run-script` a cheap way to tell which runner a name belongs to.
 */

export const DOTNET_SCRIPT_PREFIX = "dotnet:";

export interface DotnetLaunch {
	command: string;
	args: string[];
}

/** Verb -> args, with `{target}`/`{project}` filled in by the caller. */
const SCRIPTS: Array<{
	name: string;
	args: (target: string | null, project: string | null) => string[];
}> = [
	{ name: "run", args: (_target, project) => (project ? ["run", "--project", project] : ["run"]) },
	{
		name: "watch",
		args: (_target, project) => (project ? ["watch", "run", "--project", project] : ["watch", "run"]),
	},
	{ name: "build", args: (target) => (target ? ["build", target] : ["build"]) },
	{ name: "restore", args: (target) => (target ? ["restore", target] : ["restore"]) },
	{ name: "test", args: (target) => (target ? ["test", target] : ["test"]) },
	{
		name: "publish",
		args: (_target, project) =>
			project ? ["publish", project, "-c", "Release"] : ["publish", "-c", "Release"],
	},
	{ name: "clean", args: (target) => (target ? ["clean", target] : ["clean"]) },
];

async function resolveTargets(projectPath: string) {
	const detection = await detectDotnetProject(projectPath);

	if (detection.projectFiles.length === 0 && !detection.solutionFile) {
		return null;
	}

	return {
		// Build/test/restore work on the whole solution when there is one.
		target: detection.solutionFile ?? detection.entryProjectFile,
		project: detection.entryProjectFile,
	};
}

/**
 * The `dotnet:*` entries for a project, shaped like package.json scripts so the
 * Scripts pane can render them without knowing what a .NET project is. Empty
 * when the folder holds no .NET project.
 */
export async function listDotnetScripts(projectPath: string): Promise<Record<string, string>> {
	const targets = await resolveTargets(projectPath);
	if (!targets) return {};

	const scripts: Record<string, string> = {};

	for (const script of SCRIPTS) {
		const args = script.args(targets.target, targets.project);
		scripts[`${DOTNET_SCRIPT_PREFIX}${script.name}`] = `dotnet ${args.join(" ")}`;
	}

	return scripts;
}

export function isDotnetScript(scriptName: string) {
	return scriptName.startsWith(DOTNET_SCRIPT_PREFIX);
}

/**
 * The ports Kestrel will bind, read from the project's `launchSettings.json`.
 * That is where `dotnet run` gets its `applicationUrl`, so it is also where a
 * restart has to look to know what must be free before relaunching.
 */
export async function resolveDotnetPorts(projectPath: string): Promise<number[]> {
	const detection = await detectDotnetProject(projectPath);
	if (!detection.entryProjectFile) return [];

	const settingsPath = path.join(
		projectPath,
		path.dirname(detection.entryProjectFile),
		"Properties",
		"launchSettings.json",
	);

	try {
		const raw = await fs.readFile(settingsPath, "utf8");
		// Visual Studio writes these with a UTF-8 BOM, which JSON.parse rejects.
		const parsed = JSON.parse(raw.replace(/^\uFEFF/, "")) as {
			profiles?: Record<string, { applicationUrl?: string }>;
		};

		const ports = new Set<number>();

		for (const profile of Object.values(parsed.profiles ?? {})) {
			for (const url of (profile.applicationUrl ?? "").split(";")) {
				const port = Number(/:(\d{2,5})(?:\/|$)/.exec(url.trim())?.[1]);
				if (port) ports.add(port);
			}
		}

		return [...ports];
	} catch {
		// No launch settings, or unreadable — the caller just skips the wait.
		return [];
	}
}

/**
 * Waits until every port the app will bind is actually released. Killing the
 * process group is not quite enough on its own: the listener can outlive the
 * process by a beat, and rebinding in that window is what produces
 * "address already in use" on restart.
 */
export async function waitForDotnetPortsFree(projectPath: string, timeoutMs = 5000): Promise<void> {
	const ports = await resolveDotnetPorts(projectPath);
	if (ports.length === 0) return;

	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		const free = await Promise.all(ports.map((port) => isPortFree(port)));
		if (free.every(Boolean)) return;

		await new Promise((resolve) => setTimeout(resolve, 150));
	}
}

/**
 * What to spawn for a `dotnet:*` script. Null when the name is unknown or the
 * project has since gone away, so the caller can fall back to the npm path.
 */
export async function resolveDotnetLaunch(
	projectPath: string,
	scriptName: string,
): Promise<DotnetLaunch | null> {
	if (!isDotnetScript(scriptName)) return null;

	const verb = scriptName.slice(DOTNET_SCRIPT_PREFIX.length);
	const script = SCRIPTS.find((entry) => entry.name === verb);
	if (!script) return null;

	const targets = await resolveTargets(projectPath);
	if (!targets) return null;

	return { command: "dotnet", args: script.args(targets.target, targets.project) };
}
