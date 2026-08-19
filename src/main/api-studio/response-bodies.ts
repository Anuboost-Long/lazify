import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * A response body is a file, not a field.
 *
 * The index says what a route sends and what came back; the bodies sit beside
 * it one file each, so opening a project reads kilobytes rather than every
 * response ever kept, and saving a request rewrites the index alone.
 */

export function bodyFileName(routeId: string, kind: string) {
  return `${createHash("sha1").update(routeId).digest("hex").slice(0, 12)}-${kind}.txt`;
}

export function readBody(directory: string, fileName: string): string {
  try {
    return fs.readFileSync(path.join(directory, fileName), "utf8");
  } catch {
    return "";
  }
}

export function hasBody(directory: string, fileName: string): boolean {
  try {
    return fs.statSync(path.join(directory, fileName)).size > 0;
  } catch {
    return false;
  }
}

export function writeBody(directory: string, fileName: string, body: string): void {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, fileName), body, "utf8");
}

/** Whatever this route no longer references is a file nobody can reach. */
export function pruneBodies(directory: string, routeId: string, keep: Set<string>): void {
  const prefix = bodyFileName(routeId, "").split("-")[0];

  let entries: string[];

  try {
    entries = fs.readdirSync(directory);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.startsWith(prefix) || keep.has(entry)) continue;

    fs.rmSync(path.join(directory, entry), { force: true });
  }
}

export function moveBodies(from: string, to: string): void {
  let entries: string[];

  try {
    entries = fs.readdirSync(from);
  } catch {
    return;
  }

  fs.mkdirSync(to, { recursive: true });

  for (const entry of entries) {
    fs.renameSync(path.join(from, entry), path.join(to, entry));
  }

  fs.rmSync(from, { recursive: true, force: true });
}
