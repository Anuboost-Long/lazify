import fs from "node:fs";
import path from "node:path";

import { DEFAULT_SCRIPT_GLOBAL, isUsableGlobal } from "./scripting/global-name";

export { DEFAULT_SCRIPT_GLOBAL, isUsableGlobal } from "./scripting/global-name";

const SETTINGS_FILE = path.join(".lazify", "api-studio", "scripts.json");
const SETTINGS_VERSION = 1;

export interface ScriptSettings {
  global: string;
}

interface StoredSettings {
  version: number;
  global: string;
}

function settingsPath(projectPath: string) {
  return path.join(path.resolve(projectPath), SETTINGS_FILE);
}

export function readScriptSettings(projectPath: string): ScriptSettings {
  try {
    const stored = JSON.parse(fs.readFileSync(settingsPath(projectPath), "utf8")) as StoredSettings;

    return stored?.version === SETTINGS_VERSION && isUsableGlobal(stored.global)
      ? { global: stored.global }
      : { global: DEFAULT_SCRIPT_GLOBAL };
  } catch {
    return { global: DEFAULT_SCRIPT_GLOBAL };
  }
}

export function saveScriptSettings(projectPath: string, settings: ScriptSettings): ScriptSettings {
  const global = isUsableGlobal(settings.global) ? settings.global : DEFAULT_SCRIPT_GLOBAL;
  const filePath = settingsPath(projectPath);
  const stored: StoredSettings = { version: SETTINGS_VERSION, global };

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(stored, null, 2)}\n`, "utf8");

  return { global };
}
