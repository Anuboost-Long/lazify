import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/**
 * Whether autopilot may answer prompts, and where.
 *
 * Off until the user turns it on, and stored rather than remembered: a feature
 * that types into a terminal has to be something the user switched on
 * deliberately, and it must not come back on by itself after a crash.
 *
 * The per-project list is an opt-*out*. Someone who enables autopilot wants it
 * across the projects they have open — that is the whole complaint it answers —
 * but there is usually one repo that is different, and that repo needs a switch
 * of its own rather than a reason to turn the feature off everywhere.
 */

export interface AutopilotSettings {
  enabled: boolean;
  /** Project paths autopilot leaves alone while it is on elsewhere. */
  excludedProjects: string[];
}

const DEFAULTS: AutopilotSettings = { enabled: false, excludedProjects: [] };

function storeFilePath(): string {
  return path.join(app.getPath("userData"), "agent-autopilot.json");
}

export function getAutopilotSettings(): AutopilotSettings {
  try {
    const parsed = JSON.parse(fs.readFileSync(storeFilePath(), "utf8")) as Partial<AutopilotSettings>;

    return {
      enabled: parsed.enabled === true,
      excludedProjects: Array.isArray(parsed.excludedProjects) ? parsed.excludedProjects : []
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings: AutopilotSettings): AutopilotSettings {
  const filePath = storeFilePath();

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), "utf8");

  return settings;
}

export function setAutopilotEnabled(enabled: boolean): AutopilotSettings {
  return save({ ...getAutopilotSettings(), enabled });
}

/** Turns autopilot on or off for one project, leaving the master switch alone. */
export function setAutopilotProject(projectPath: string, enabled: boolean): AutopilotSettings {
  const settings = getAutopilotSettings();
  const excluded = settings.excludedProjects.filter((entry) => entry !== projectPath);

  return save({
    ...settings,
    excludedProjects: enabled ? excluded : [...excluded, projectPath]
  });
}

/** True when autopilot is allowed to act in this project. */
export function isAutopilotActive(projectPath: string): boolean {
  const settings = getAutopilotSettings();

  return settings.enabled && !settings.excludedProjects.includes(projectPath);
}
