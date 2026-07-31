import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Turns a built `.app` into a `.dmg` anyone can install from.
 *
 * Nothing clever, and deliberately no new dependency: macOS ships every tool
 * this needs. `ditto` copies the bundle (the only copy that keeps symlinks,
 * permissions and extended attributes intact — `cp -R` quietly flattens things
 * a signed bundle needs), and `hdiutil` makes the image.
 *
 * The one design choice worth stating is the layout. The image is staged with
 * the app beside an alias to /Applications, which is the drag-to-install window
 * every Mac user already knows how to use. A DMG containing only the bundle
 * would be smaller work and would leave whoever opens it dragging the app to a
 * folder they have to go and find.
 */

/** What a `.app` says about itself, as far as naming the image is concerned. */
export interface AppBundleInfo {
  appPath: string;
  /** Display name: `CFBundleDisplayName`, then `CFBundleName`, then the folder. */
  name: string;
  version: string | null;
  identifier: string | null;
  /** Total bundle size on disk, for the size shown beside the picked app. */
  sizeBytes: number;
  /** `Name-1.2.3.dmg`, or `Name.dmg` when the bundle carries no version. */
  suggestedFileName: string;
  /**
   * The app's own icon as a PNG data URL, or null when it has none this can
   * read.
   *
   * Worth the two extra processes: the icon is how the user recognises the thing
   * they picked. A generic placeholder makes every app look like every other
   * app, and the one mistake this page can make is packaging the wrong one.
   */
  iconDataUrl: string | null;
}

export type DmgStep = "staging" | "compressing" | "done";

export interface DmgProgress {
  step: DmgStep;
  /** The path being worked on, so the UI can name what it is waiting for. */
  detail: string;
}

export interface DmgResult {
  success: boolean;
  /** Where the image ended up. Empty when it was never created. */
  outputPath: string;
  sizeBytes: number;
  /** Why it failed, ready to show. Null on success. */
  message: string | null;
}

/**
 * HFS+ volume names are capped at 27 characters, and `hdiutil` fails outright
 * rather than truncating one that is too long.
 */
const MAX_VOLUME_NAME = 27;

/** Runs a command and collects its output, without a shell in the way. */
function run(
  command: string,
  args: string[]
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

/** Adds up a directory tree, following nothing — a bundle is all real files. */
function directorySize(target: string): number {
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
function bundleProblem(appPath: string): string | null {
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
async function readInfoPlist(appPath: string): Promise<Record<string, unknown>> {
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

function stringField(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * The bundle's `.icns`, converted to a PNG data URL.
 *
 * `CFBundleIconFile` names it, with or without the extension, and plenty of
 * bundles leave the key out entirely — so any `.icns` in Resources will do when
 * the named one is missing. Apps that ship their icon in a compiled asset
 * catalog have no `.icns` at all, which is why every step here may come up empty
 * and the whole thing is allowed to return null.
 */
async function readBundleIcon(
  appPath: string,
  info: Record<string, unknown>
): Promise<string | null> {
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

  const icon = candidates
    .map((entry) => path.join(resources, entry))
    .find((candidate) => fs.existsSync(candidate));

  if (!icon) return null;

  // `sips` writes to a file rather than stdout, so it needs somewhere to put it.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-icon-"));
  const png = path.join(scratch, "icon.png");

  try {
    // 128px: sharp on a retina display at the size it is drawn, and small
    // enough that the data URL is not worth thinking about.
    const { code } = await run("sips", ["-s", "format", "png", "-Z", "128", icon, "--out", png]);

    if (code !== 0 || !fs.existsSync(png)) return null;

    return `data:image/png;base64,${fs.readFileSync(png).toString("base64")}`;
  } catch {
    return null;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

/** Strips what a filename cannot carry, so a display name can become one. */
function fileSafe(value: string): string {
  return value.replace(/[/\\:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
}

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
    iconDataUrl: await readBundleIcon(appPath, info)
  };
}

/** Where the image goes when the user has not said otherwise: beside the app. */
export function defaultOutputPath(appPath: string, suggestedFileName: string): string {
  return path.join(path.dirname(appPath), suggestedFileName);
}

export interface CompileDmgOptions {
  appPath: string;
  /** Full path of the `.dmg` to write, extension included. */
  outputPath: string;
  /** Mounted volume name. Defaults to the bundle's display name. */
  volumeName?: string | null;
}

/**
 * Builds the image. Resolves with a result either way rather than throwing, so
 * a failed build is something the page can show instead of an unhandled reject.
 */
export async function compileDmg(
  options: CompileDmgOptions,
  onProgress?: (progress: DmgProgress) => void
): Promise<DmgResult> {
  const { appPath, outputPath } = options;
  const failed = (message: string): DmgResult => ({
    success: false,
    outputPath: "",
    sizeBytes: 0,
    message
  });

  const problem = bundleProblem(appPath);
  if (problem) return failed(problem);

  if (!outputPath.toLowerCase().endsWith(".dmg")) {
    return failed("The output file needs a .dmg extension.");
  }

  const destination = path.dirname(outputPath);

  if (!fs.existsSync(destination)) {
    return failed("That destination folder no longer exists.");
  }

  // Refuse to write the image inside the bundle being packaged: `ditto` would
  // then be copying a directory that is growing as it reads it.
  if (path.resolve(outputPath).startsWith(`${path.resolve(appPath)}${path.sep}`)) {
    return failed("Choose a destination outside the app itself.");
  }

  const info = await inspectAppBundle(appPath);
  const volumeName = (options.volumeName?.trim() || info.name).slice(0, MAX_VOLUME_NAME);

  // Staged in a temp directory rather than beside the app: the image gets
  // exactly what is put here, and the user's folder gets nothing it did not ask
  // for even if this fails halfway.
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-dmg-"));

  try {
    onProgress?.({ step: "staging", detail: path.basename(appPath) });

    const staged = path.join(stage, path.basename(appPath));
    const copy = await run("ditto", [appPath, staged]);

    if (copy.code !== 0) {
      return failed(copy.stderr.trim() || "Copying the app into the image failed.");
    }

    // The drag-to-install half of the window.
    fs.symlinkSync("/Applications", path.join(stage, "Applications"));

    onProgress?.({ step: "compressing", detail: path.basename(outputPath) });

    const create = await run("hdiutil", [
      "create",
      "-volname",
      volumeName,
      "-srcfolder",
      stage,
      // HFS+ rather than APFS: an APFS image will not mount on macOS 10.12 and
      // earlier, and nothing here needs anything APFS offers.
      "-fs",
      "HFS+",
      // UDZO is the compressed read-only format a distributable DMG uses.
      "-format",
      "UDZO",
      // Overwrite: the save dialog already asked about replacing the file.
      "-ov",
      outputPath
    ]);

    if (create.code !== 0) {
      return failed(create.stderr.trim() || "Building the disk image failed.");
    }

    onProgress?.({ step: "done", detail: path.basename(outputPath) });

    return {
      success: true,
      outputPath,
      sizeBytes: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
      message: null
    };
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  } finally {
    // The staged copy is a full duplicate of the app, so leaving it behind would
    // quietly fill the temp directory one build at a time.
    fs.rmSync(stage, { recursive: true, force: true });
  }
}
