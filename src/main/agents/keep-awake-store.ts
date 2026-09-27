import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

/**
 * Whether the machine is kept awake while agents work.
 *
 * On unless the user turns it off: a run stalling because the system dozed
 * off is the failure it exists to prevent, and nobody notices it missing until
 * that has already happened.
 */

function storeFilePath(): string {
  return path.join(app.getPath("userData"), "keep-awake.json");
}

export function readKeepAwake(): boolean {
  try {
    const parsed = JSON.parse(fs.readFileSync(storeFilePath(), "utf8")) as { enabled?: boolean };

    return parsed.enabled !== false;
  } catch {
    return true;
  }
}

export function saveKeepAwake(enabled: boolean): boolean {
  const filePath = storeFilePath();

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ enabled }, null, 2), "utf8");

  return enabled;
}
