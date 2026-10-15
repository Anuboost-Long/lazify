import { currentOs, execFile } from "@/platform/exec";
import { appDataPath, createFolder, readTextFile, writeTextFile } from "@/platform/folders";
import path from "@/shared/lib/path";
import { ignoreLazifyDirectory } from "@/shared/lib/projects/lazify-directory";

import type { ApiEnvironment, ApiEnvironmentSet, CustomVariable } from "./types";

/**
 * Presets travel with the folder, the values inside them do not.
 *
 * Names, order, and every value that is not a secret live in the project's
 * ignored .lazify directory, so anything working in this checkout reads the
 * same Local and Staging. Secret values are keyed by project and environment
 * in the app's own storage, so a token never lands in the project at all.
 */

const PRESET_FILE = ".lazify/api-studio/environments.json";
const PRESET_VERSION = 1;
const DEFAULT_ENVIRONMENT: ApiEnvironment = { id: "local", name: "Local", values: {} };

interface StoredPresets {
	version: number;
	activeId: string;
	environments: ApiEnvironment[];
	variables?: CustomVariable[];
	names?: Record<string, string>;
}

type StoredSecrets = Record<string, Record<string, Record<string, string>>>;

function presetFilePath(projectPath: string) {
	return path.join(path.resolve(projectPath), PRESET_FILE);
}

async function secretFilePath() {
	return path.join(await appDataPath(), "api-studio-environments.json");
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
	try {
		const content = await readTextFile(filePath);
		if (!content) return fallback;

		const parsed = JSON.parse(content) as T;

		return parsed && typeof parsed === "object" ? parsed : fallback;
	} catch {
		return fallback;
	}
}

/** An earlier build stored one flat set of values per project. */
function migrateSecrets(stored: unknown): Record<string, Record<string, string>> {
	const entries = Object.entries((stored ?? {}) as Record<string, unknown>);
	const flat = entries.filter(([, value]) => typeof value === "string") as Array<[string, string]>;

	if (flat.length === 0) return (stored ?? {}) as Record<string, Record<string, string>>;

	return { [DEFAULT_ENVIRONMENT.id]: Object.fromEntries(flat) };
}

async function readSecrets(projectPath: string) {
	const all = await readJson<StoredSecrets>(await secretFilePath(), {});

	return migrateSecrets(all[path.resolve(projectPath)]);
}

/** What the policy called these before variables took the header's own name. */
const RETIRED_KEYS: Record<string, string> = {
	bearerToken: "authorization",
	basicAuth: "authorization",
};

function withRenamedKeys<TValue>(values: Record<string, TValue>): Record<string, TValue> {
	const retired = Object.entries(values)
		.filter(([key]) => RETIRED_KEYS[key])
		.map(([key, value]) => [RETIRED_KEYS[key], value] as const);
	const current = Object.entries(values).filter(([key]) => !RETIRED_KEYS[key]);

	return Object.fromEntries([...retired, ...current]);
}

/** A declared variable's value used to be filed under its label, not its key. */
function withCustomKeys(
	values: Record<string, string>,
	variables: { key: string; name: string }[],
): Record<string, string> {
	const moved = { ...values };

	for (const variable of variables) {
		if (moved[variable.key] === undefined && moved[variable.name] !== undefined) {
			moved[variable.key] = moved[variable.name];
			delete moved[variable.name];
		}
	}

	return moved;
}

function withoutEmpty(values: Record<string, string>) {
	return Object.fromEntries(
		Object.entries(values).filter(([, value]) => typeof value === "string" && value.length > 0),
	);
}

export async function readEnvironments(projectPath: string): Promise<ApiEnvironmentSet> {
	const presets = await readJson<StoredPresets | null>(presetFilePath(projectPath), null);
	const secrets = await readSecrets(projectPath);
	const environments =
		presets?.version === PRESET_VERSION &&
		Array.isArray(presets.environments) &&
		presets.environments.length > 0
			? presets.environments
			: [DEFAULT_ENVIRONMENT];

	const declared = (presets?.variables ?? []).map((variable) => ({
		key: variable.key ?? variable.name,
		name: variable.name,
	}));

	const merged = environments.map((environment) => ({
		...environment,
		values: withCustomKeys(
			withRenamedKeys({ ...environment.values, ...secrets[environment.id] }),
			declared,
		),
	}));

	return {
		activeId: merged.some((environment) => environment.id === presets?.activeId)
			? presets!.activeId
			: merged[0].id,
		environments: merged,
		variables: (presets?.variables ?? []).map((variable) => ({
			...variable,
			key: variable.key ?? variable.name,
		})),
		names: withRenamedKeys(presets?.names ?? {}),
	};
}

/** Windows ACLs aren't POSIX mode bits; the owner-only restriction is a POSIX-only extra. */
async function restrictToOwner(filePath: string) {
	if ((await currentOs()) === "windows") return;

	await execFile("chmod", ["600", filePath]).catch(() => undefined);
}

export async function saveEnvironments(
	projectPath: string,
	set: ApiEnvironmentSet,
	secretNames: string[],
): Promise<ApiEnvironmentSet> {
	const isSecret = new Set(secretNames);

	const presets: StoredPresets = {
		version: PRESET_VERSION,
		activeId: set.activeId,
		variables: set.variables,
		names: set.names,
		environments: set.environments.map((environment) => ({
			id: environment.id,
			name: environment.name,
			values: withoutEmpty(
				Object.fromEntries(Object.entries(environment.values).filter(([name]) => !isSecret.has(name))),
			),
		})),
	};

	const presetPath = presetFilePath(projectPath);

	await createFolder(path.dirname(presetPath));
	await ignoreLazifyDirectory(projectPath);
	await writeTextFile(presetPath, `${JSON.stringify(presets, null, 2)}\n`);

	const secretPath = await secretFilePath();
	const all = await readJson<StoredSecrets>(secretPath, {});
	const kept: Record<string, Record<string, string>> = {};

	for (const environment of set.environments) {
		const secrets = withoutEmpty(
			Object.fromEntries(Object.entries(environment.values).filter(([name]) => isSecret.has(name))),
		);

		if (Object.keys(secrets).length > 0) kept[environment.id] = secrets;
	}

	const resolvedProjectPath = path.resolve(projectPath);

	if (Object.keys(kept).length > 0) all[resolvedProjectPath] = kept;
	else delete all[resolvedProjectPath];

	await createFolder(path.dirname(secretPath));
	await writeTextFile(secretPath, JSON.stringify(all, null, 2));
	await restrictToOwner(secretPath);

	return readEnvironments(projectPath);
}
