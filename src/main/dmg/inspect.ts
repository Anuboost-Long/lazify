import path from "node:path";

import {
  bundleProblem,
  directorySize,
  fileSafe,
  findBundleIcon,
  readInfoPlist,
  stringField
} from "./bundle";
import { readImagePreview } from "./images";
import type { AppBundleInfo } from "./types";

/**
 * Reads a `.app` so the UI can show what was picked and suggest a filename.
 * Throws with a readable reason when the path is not a usable bundle.
 */
export async function inspectAppBundle(appPath: string): Promise<AppBundleInfo> {
  const problem = bundleProblem(appPath);
  if (problem) throw new Error(problem);

  const info = await readInfoPlist(appPath);
  const fallbackName = path.basename(appPath, ".app");
  const name =
    stringField(info, "CFBundleDisplayName") ?? stringField(info, "CFBundleName") ?? fallbackName;
  const version =
    stringField(info, "CFBundleShortVersionString") ?? stringField(info, "CFBundleVersion");

  const base = fileSafe(name) || fallbackName;

  return {
    appPath,
    name,
    version,
    identifier: stringField(info, "CFBundleIdentifier"),
    sizeBytes: directorySize(appPath),
    suggestedFileName: version ? `${base}-${version}.dmg` : `${base}.dmg`,
    // 128px: sharp on a retina display at the size it is drawn, and small enough
    // that the data URL is not worth thinking about.
    iconDataUrl: await readImagePreview(findBundleIcon(appPath, info) ?? "", 128)
  };
}

/** Where the image goes when the user has not said otherwise: beside the app. */
export function defaultOutputPath(appPath: string, suggestedFileName: string): string {
  return path.join(path.dirname(appPath), suggestedFileName);
}
