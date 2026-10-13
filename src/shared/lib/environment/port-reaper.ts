import { execFile } from "@/platform/exec";

import { buildProcessTree, getDescendantPids, readCommandLines, scanListeningPorts } from "./ports";

/**
 * "Something is already using port 3000" — and then what.
 *
 * Answers who holds the port and offers to end it. The scanning is the easy
 * half; the care is in what may not be killed. Lazify's own processes are off
 * limits, because reaping the port a renderer happens to hold would take the
 * window doing the reaping with it.
 */

/** How long a process gets to exit on SIGTERM before SIGKILL. */
const TERM_GRACE_MS = 1500;

/**
 * The renderer's dev server, in a development run. It listens from a process
 * Lazify did not spawn — a sibling of this one, not a descendant — so the
 * ownership check below cannot see it, yet reaping it blanks the very window
 * the user is reaping from. Empty in a packaged build, which serves its own
 * files over the app's own scheme and has no such port.
 */
function requiredPorts(): Set<number> {
	const { protocol, port } = globalThis.location ?? {};
	return protocol?.startsWith("http") && port ? new Set([Number(port)]) : new Set();
}

let appPid: Promise<number> | null = null;

/** Lazify's own process: the parent of anything it spawns. */
function ownPid(): Promise<number> {
	appPid ??= execFile("/bin/sh", ["-c", "echo $PPID"]).then(({ stdout }) => Number(stdout.trim()));
	return appPid;
}

export interface ListeningProcess {
	pid: number;
	port: number;
	/** Short name from lsof, e.g. "node". */
	command: string;
	address: string;
	/** Full argv, so `node` becomes something the user can recognise. */
	commandLine: string;
	/** Lazify itself. Never killable — it would take the app down. */
	isProtected: boolean;
	/** A script Lazify started. Killable, but the Scripts pane is tidier. */
	isManaged: boolean;
}

/**
 * Everything currently listening, annotated with what may be done about it.
 *
 * Ports Lazify needs to keep running are left out of the list entirely rather
 * than listed and locked: an offered row invites a click, and this is one the
 * user cannot be allowed to land.
 *
 * @param managedRootPids PTY session pids, so scripts Lazify launched can be
 * told apart from Lazify's own machinery.
 */
export async function listListeningProcesses(
	managedRootPids: number[] = [],
): Promise<ListeningProcess[]> {
	const [ports, tree, commandLines, pid] = await Promise.all([
		scanListeningPorts(),
		buildProcessTree(),
		readCommandLines(),
		ownPid(),
	]);

	const ownPids = getDescendantPids(pid, tree);
	const required = requiredPorts();
	const managedPids = new Set<number>();
	for (const rootPid of managedRootPids) {
		for (const pid of getDescendantPids(rootPid, tree)) managedPids.add(pid);
	}

	return ports
		.filter((entry) => !required.has(entry.port))
		.map((entry) => {
			const isManaged = managedPids.has(entry.pid);
			return {
				...entry,
				commandLine: commandLines.get(entry.pid) ?? entry.command,
				// A managed script lives inside Lazify's tree too, but it is exactly the
				// thing the user means to kill — so it is not protected.
				isProtected: ownPids.has(entry.pid) && !isManaged,
				isManaged,
			};
		});
}

function isAlive(pid: number): Promise<boolean> {
	// Signal 0 tests for existence without delivering anything.
	return execFile("kill", ["-0", String(pid)]).then(
		() => true,
		() => false,
	);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface KillResult {
	success: boolean;
	message: string;
}

/**
 * Whether the subtree about to be signalled holds a port Lazify needs.
 *
 * The list never offers one, so this is only reached through a stale row or a
 * caller that made the pid up — but one of those ports going down takes the
 * window with it.
 */
async function holdsRequiredPort(targets: number[]): Promise<boolean> {
	const required = requiredPorts();

	if (required.size === 0) return false;

	const listening = await scanListeningPorts();

	return listening.some((entry) => targets.includes(entry.pid) && required.has(entry.port));
}

async function signal(pids: number[], name: "SIGTERM" | "SIGKILL"): Promise<void> {
	for (const target of pids) {
		// Already gone, or not ours to signal.
		await execFile("kill", ["-s", name.slice(3), String(target)]).catch(() => undefined);
	}
}

/**
 * Ends the process holding a port, and its children with it — a dev server that
 * spawned workers keeps the port bound if only the parent is asked to leave.
 *
 * Protection is re-checked here rather than trusted from the caller: this is the
 * boundary where a wrong pid does real damage.
 */
export async function killListeningProcess(
	pid: number,
	managedRootPids: number[] = [],
): Promise<KillResult> {
	if (!Number.isInteger(pid) || pid <= 1) {
		return { success: false, message: "Refusing to signal that process." };
	}

	const tree = await buildProcessTree();
	const ownPids = getDescendantPids(await ownPid(), tree);
	const managedPids = new Set<number>();
	for (const rootPid of managedRootPids) {
		for (const child of getDescendantPids(rootPid, tree)) managedPids.add(child);
	}

	if (ownPids.has(pid) && !managedPids.has(pid)) {
		return { success: false, message: "That process belongs to Lazify." };
	}

	// Children first: a parent reaped before its children orphans them, and an
	// orphan can keep the socket open.
	const targets = [...getDescendantPids(pid, tree)].sort((a, b) => b - a);

	if (await holdsRequiredPort(targets)) {
		return { success: false, message: "That port is keeping Lazify running." };
	}

	await signal(targets, "SIGTERM");

	await sleep(TERM_GRACE_MS);

	const alive = await Promise.all(targets.map(isAlive));
	const survivors = targets.filter((_target, index) => alive[index]);

	await signal(survivors, "SIGKILL");

	if (await isAlive(pid)) {
		return { success: false, message: "The process is still running." };
	}

	return {
		success: true,
		message: survivors.length > 0 ? "Force stopped." : "Stopped.",
	};
}
