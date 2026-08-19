import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

import { hostOf } from "./runner/build-request";

const STORE_FILE = "api-studio-allowed-hosts.json";

type StoredHosts = Record<string, string[]>;

function storePath() {
  return path.join(app.getPath("userData"), STORE_FILE);
}

function read(): StoredHosts {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8")) as StoredHosts;

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readAllowedHosts(projectPath: string): string[] {
  return read()[path.resolve(projectPath)] ?? [];
}

export function allowHost(projectPath: string, url: string): string[] {
  const host = hostOf(url);
  if (!host) return readAllowedHosts(projectPath);

  const all = read();
  const resolvedProjectPath = path.resolve(projectPath);
  const kept = Array.from(new Set([...(all[resolvedProjectPath] ?? []), host]));

  all[resolvedProjectPath] = kept;

  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), `${JSON.stringify(all, null, 2)}\n`, { mode: 0o600 });

  return kept;
}

export function forgetHost(projectPath: string, host: string): string[] {
  const all = read();
  const resolvedProjectPath = path.resolve(projectPath);
  const kept = (all[resolvedProjectPath] ?? []).filter((allowed) => allowed !== host);

  if (kept.length > 0) all[resolvedProjectPath] = kept;
  else delete all[resolvedProjectPath];

  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), `${JSON.stringify(all, null, 2)}\n`, { mode: 0o600 });

  return kept;
}
