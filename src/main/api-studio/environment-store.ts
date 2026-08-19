import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

import type { ApiEnvironment, ApiEnvironmentSet, CustomVariable } from "./types";

/**
 * Presets are shared, the values inside them are not.
 *
 * Names, order, and every value that is not a secret live in the project, so a
 * team gets the same Local and Staging without agreeing on them twice. Secret
 * values are keyed by project and environment in the app's own storage, so a
 * token cannot travel with the repository.
 */

const PRESET_FILE = path.join(".lazify", "api-studio", "environments.json");
const PRESET_VERSION = 1;
const DEFAULT_ENVIRONMENT: ApiEnvironment = { id: "local", name: "Local", values: {} };

interface StoredPresets {
  version: number;
  activeId: string;
  environments: ApiEnvironment[];
  variables?: CustomVariable[];
}

type StoredSecrets = Record<string, Record<string, Record<string, string>>>;

function presetFilePath(projectPath: string) {
  return path.join(path.resolve(projectPath), PRESET_FILE);
}

function secretFilePath() {
  return path.join(app.getPath("userData"), "api-studio-environments.json");
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as T;

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

function readSecrets(projectPath: string) {
  const all = readJson<StoredSecrets>(secretFilePath(), {});

  return migrateSecrets(all[path.resolve(projectPath)]);
}

function withoutEmpty(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => typeof value === "string" && value.length > 0)
  );
}

export function readEnvironments(projectPath: string): ApiEnvironmentSet {
  const presets = readJson<StoredPresets | null>(presetFilePath(projectPath), null);
  const secrets = readSecrets(projectPath);
  const environments =
    presets?.version === PRESET_VERSION && Array.isArray(presets.environments) && presets.environments.length > 0
      ? presets.environments
      : [DEFAULT_ENVIRONMENT];

  const merged = environments.map((environment) => ({
    ...environment,
    values: { ...environment.values, ...(secrets[environment.id] ?? {}) }
  }));

  return {
    activeId: merged.some((environment) => environment.id === presets?.activeId)
      ? presets!.activeId
      : merged[0].id,
    environments: merged,
    variables: presets?.variables ?? []
  };
}

export function saveEnvironments(
  projectPath: string,
  set: ApiEnvironmentSet,
  secretNames: string[]
): ApiEnvironmentSet {
  const isSecret = new Set(secretNames);

  const presets: StoredPresets = {
    version: PRESET_VERSION,
    activeId: set.activeId,
    variables: set.variables,
    environments: set.environments.map((environment) => ({
      id: environment.id,
      name: environment.name,
      values: withoutEmpty(
        Object.fromEntries(
          Object.entries(environment.values).filter(([name]) => !isSecret.has(name))
        )
      )
    }))
  };

  const presetPath = presetFilePath(projectPath);

  fs.mkdirSync(path.dirname(presetPath), { recursive: true });
  fs.writeFileSync(presetPath, `${JSON.stringify(presets, null, 2)}\n`, "utf8");

  const all = readJson<StoredSecrets>(secretFilePath(), {});
  const kept: Record<string, Record<string, string>> = {};

  for (const environment of set.environments) {
    const secrets = withoutEmpty(
      Object.fromEntries(Object.entries(environment.values).filter(([name]) => isSecret.has(name)))
    );

    if (Object.keys(secrets).length > 0) kept[environment.id] = secrets;
  }

  const resolvedProjectPath = path.resolve(projectPath);

  if (Object.keys(kept).length > 0) all[resolvedProjectPath] = kept;
  else delete all[resolvedProjectPath];

  fs.mkdirSync(path.dirname(secretFilePath()), { recursive: true });
  fs.writeFileSync(secretFilePath(), `${JSON.stringify(all, null, 2)}\n`, { mode: 0o600 });

  return readEnvironments(projectPath);
}
