import fs from "node:fs";
import path from "node:path";

import { run } from "./run";

/** Reading a `.app`: whether it is one, what it calls itself, where its icon is. */

/** Adds up a directory tree, following nothing — a bundle is all real files. */
export function directorySize(target: string): number {
  let total = 0;

  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const child = path.join(current, entry.name);

      // Symlinks inside a bundle point at files already counted (or outside it
      // entirely), so they contribute their own size and nothing more.
      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        walk(child);
        continue;
      }

      try {
        total += fs.statSync(child).size;
      } catch {
        // A file that vanished mid-walk is not worth failing a size estimate.
      }
    }
  };

  walk(target);

  return total;
}

/**
 * Why this path is not a `.app` this can work with, or null when it is fine.
 *
 * A bundle is a directory, so every ordinary "is it a file" check passes on
 * things that are not apps at all. What actually identifies one is the
 * executable directory inside it.
 */
export function bundleProblem(appPath: string): string | null {
  if (process.platform !== "darwin") {
    return "Disk images can only be built on macOS.";
  }

  if (!appPath || !fs.existsSync(appPath)) {
    return "That app could not be found.";
  }

  if (!appPath.toLowerCase().endsWith(".app") || !fs.statSync(appPath).isDirectory()) {
    return "Pick a macOS .app bundle.";
  }

  if (!fs.existsSync(path.join(appPath, "Contents", "MacOS"))) {
    return "That folder is named .app but is not an app bundle.";
  }

  return null;
}

/** Reads `Info.plist` as JSON via `plutil`, or an empty object if unreadable. */
export async function readInfoPlist(appPath: string): Promise<Record<string, unknown>> {
  const plist = path.join(appPath, "Contents", "Info.plist");

  if (!fs.existsSync(plist)) return {};

  try {
    // `-o -` writes to stdout, leaving the bundle untouched.
    const { code, stdout } = await run("plutil", ["-convert", "json", "-o", "-", plist]);
    if (code !== 0) return {};

    const parsed = JSON.parse(stdout) as unknown;

    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    // A binary plist plutil cannot read, or output that is not JSON. The
    // filename falls back to the bundle's own name, which is always there.
    return {};
  }
}

export function stringField(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Where the bundle keeps its `.icns`, or null.
 *
 * `CFBundleIconFile` names it, with or without the extension, and plenty of
 * bundles leave the key out entirely — so any `.icns` in Resources will do when
 * the named one is missing. Apps that ship their icon in a compiled asset
 * catalog have no `.icns` at all, which is why this is allowed to come up empty:
 * both callers treat a missing icon as "show nothing" rather than as a failure.
 */
export function findBundleIcon(appPath: string, info: Record<string, unknown>): string | null {
  const resources = path.join(appPath, "Contents", "Resources");
  if (!fs.existsSync(resources)) return null;

  const named = stringField(info, "CFBundleIconFile");
  const candidates: string[] = [];

  if (named) {
    candidates.push(named.toLowerCase().endsWith(".icns") ? named : `${named}.icns`);
  }

  try {
    candidates.push(
      ...fs.readdirSync(resources).filter((entry) => entry.toLowerCase().endsWith(".icns"))
    );
  } catch {
    return null;
  }

  return (
    candidates
      .map((entry) => path.join(resources, entry))
      .find((candidate) => fs.existsSync(candidate)) ?? null
  );
}

/** Strips what a filename cannot carry, so a display name can become one. */
export function fileSafe(value: string): string {
  return value.replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
}
