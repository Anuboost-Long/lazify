import { restrictToOwner } from "@/platform/exec";
import { appDataPath, createFolder, readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";

import { hostOf } from "./runner/build-request";

const STORE_FILE = "api-studio-allowed-hosts.json";

type StoredHosts = Record<string, string[]>;

async function storePath() {
	return path.join(await appDataPath(), STORE_FILE);
}

async function read(): Promise<StoredHosts> {
	try {
		const content = await readTextFile(await storePath());
		if (!content) return {};

		const parsed = JSON.parse(content) as StoredHosts;

		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

async function write(all: StoredHosts) {
	const target = await storePath();

	await createFolder(path.dirname(target));
	await writeTextFile(target, `${JSON.stringify(all, null, 2)}\n`);
	await restrictToOwner(target);
}

export async function readAllowedHosts(projectPath: string): Promise<string[]> {
	return (await read())[path.resolve(projectPath)] ?? [];
}

export async function allowHost(projectPath: string, url: string): Promise<string[]> {
	const host = hostOf(url);
	if (!host) return readAllowedHosts(projectPath);

	const all = await read();
	const resolvedProjectPath = path.resolve(projectPath);
	const kept = Array.from(new Set([...(all[resolvedProjectPath] ?? []), host]));

	all[resolvedProjectPath] = kept;
	await write(all);

	return kept;
}

export async function forgetHost(projectPath: string, host: string): Promise<string[]> {
	const all = await read();
	const resolvedProjectPath = path.resolve(projectPath);
	const kept = (all[resolvedProjectPath] ?? []).filter((allowed) => allowed !== host);

	if (kept.length > 0) all[resolvedProjectPath] = kept;
	else delete all[resolvedProjectPath];

	await write(all);

	return kept;
}
