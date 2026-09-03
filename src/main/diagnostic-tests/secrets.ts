import fs from "node:fs/promises";
import path from "node:path";

import { parseEnvFile } from "../projects/env";
import { InfrastructureError } from "./errors";

const ENV_FILES = [".env.test", ".env.local", ".env"];

export interface SecretVault {
	resolve(name: string): string;
	register(names: readonly string[]): void;
	values(): string[];
	missing(names: readonly string[]): string[];
}

async function readEnvFile(filePath: string): Promise<Map<string, string>> {
	try {
		const text = await fs.readFile(filePath, "utf8");
		const entries = parseEnvFile(text)
			.filter((variable) => variable.enabled)
			.map((variable): [string, string] => [variable.key, variable.value]);

		return new Map(entries);
	} catch {
		return new Map();
	}
}

export async function loadSecretVault(projectPath: string): Promise<SecretVault> {
	const files = await Promise.all(
		ENV_FILES.map((name) => readEnvFile(path.join(path.resolve(projectPath), name))),
	);

	const resolved = new Map<string, string>();
	const used = new Set<string>();

	for (let index = files.length - 1; index >= 0; index -= 1) {
		for (const [key, value] of files[index]) resolved.set(key, value);
	}

	for (const [key, value] of Object.entries(process.env)) {
		if (value !== undefined) resolved.set(key, value);
	}

	return {
		resolve(name) {
			const value = resolved.get(name);
			if (value === undefined) {
				throw new InfrastructureError(
					`Secret ${name} is not set. Add it to the environment or to ${ENV_FILES.join(", ")}.`,
				);
			}

			used.add(value);
			return value;
		},
		register(names) {
			for (const name of names) {
				const value = resolved.get(name);
				if (value) used.add(value);
			}
		},
		values() {
			return Array.from(used);
		},
		missing(names) {
			return names.filter((name) => !resolved.has(name));
		},
	};
}
