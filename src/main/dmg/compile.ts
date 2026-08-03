import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { bundleProblem, directorySize, findBundleIcon, readInfoPlist } from "./bundle";
import { imagePixelSize, writeIcns, writePng } from "./images";
import { inspectAppBundle } from "./inspect";
import { run } from "./run";
import type { CompileDmgOptions, DmgProgress, DmgResult } from "./types";
import { detachVolume, mountPointFrom, setCustomIconFlag } from "./volume";
import { layoutScript, windowLayout } from "./window-layout";

/**
 * HFS+ volume names are capped at 27 characters, and `hdiutil` fails outright
 * rather than truncating one that is too long.
 */
const MAX_VOLUME_NAME = 27;

/** Free space left in the mounted image for the icon and `.DS_Store`. */
const IMAGE_HEADROOM_MB = 32;

/** How long Finder gets to apply the layout, including a first-run TCC prompt. */
const LAYOUT_TIMEOUT_MS = 120_000;

/**
 * Builds the image. Resolves with a result either way rather than throwing, so
 * a failed build is something the page can show instead of an unhandled reject.
 *
 * The stage order is load-bearing — see the note in `../dmg-compiler.ts`.
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
    message,
    warning: null
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
  // for even if this fails halfway. The read/write image lives beside the stage
  // rather than in it, or `hdiutil` would be packaging its own output.
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-dmg-"));
  const stage = path.join(work, "stage");
  const scratchImage = path.join(work, "scratch.dmg");
  /** Mounted right now, so the failure paths know to unmount before giving up. */
  let mountPoint: string | null = null;
  let warning: string | null = null;

  fs.mkdirSync(stage);

  try {
    onProgress?.({ step: "staging", detail: path.basename(appPath) });

    const appFileName = path.basename(appPath);
    const copy = await run("ditto", [appPath, path.join(stage, appFileName)]);

    if (copy.code !== 0) {
      return failed(copy.stderr.trim() || "Copying the app into the image failed.");
    }

    // The drag-to-install half of the window.
    fs.symlinkSync("/Applications", path.join(stage, "Applications"));

    // The backdrop is staged rather than written after mounting, because Finder
    // has to be able to point at it in the same breath as it sets the layout.
    // Dot-prefixed so the window shows two icons and nothing else.
    let backgroundFileName: string | null = null;
    let backgroundSize: { width: number; height: number } | null = null;

    if (options.backgroundImagePath && fs.existsSync(options.backgroundImagePath)) {
      const backgroundDir = path.join(stage, ".background");
      const background = path.join(backgroundDir, "background.png");

      fs.mkdirSync(backgroundDir);

      if (await writePng(options.backgroundImagePath, background)) {
        backgroundFileName = "background.png";
        backgroundSize = await imagePixelSize(background);
      } else {
        warning = "That background image could not be read, so the window was left plain.";
      }
    }

    const layout = windowLayout(backgroundSize);

    onProgress?.({ step: "styling", detail: volumeName });

    // Read/write, and deliberately roomier than the contents: the `.DS_Store`
    // and the volume icon are both written after this is mounted, and an image
    // sized exactly to its contents has nowhere to put them.
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
      "-size",
      `${Math.ceil(directorySize(stage) / (1024 * 1024)) + IMAGE_HEADROOM_MB}m`,
      // UDRW so it can be dressed. The image that ships is converted at the end.
      "-format",
      "UDRW",
      "-ov",
      scratchImage
    ]);

    if (create.code !== 0) {
      return failed(create.stderr.trim() || "Building the disk image failed.");
    }

    // `-nobrowse` and `-noautoopen` keep the half-built image from flashing up
    // in the user's Finder while this works on it.
    const attach = await run("hdiutil", [
      "attach",
      scratchImage,
      "-nobrowse",
      "-noverify",
      "-noautoopen"
    ]);

    if (attach.code !== 0) {
      return failed(attach.stderr.trim() || "The disk image could not be mounted to style it.");
    }

    mountPoint = mountPointFrom(attach.stdout);

    if (!mountPoint) {
      return failed("The disk image mounted somewhere this could not find.");
    }

    // Not `volumeName`: mounting a second volume of the same name gets you
    // "Name 1", and Finder only answers to what the volume is actually called.
    const diskName = path.basename(mountPoint);
    const script = path.join(work, "layout.applescript");

    fs.writeFileSync(script, layoutScript(diskName, appFileName, layout, backgroundFileName));

    const styled = await run("osascript", [script], LAYOUT_TIMEOUT_MS);

    if (styled.code !== 0) {
      // Everything past here still works, and a plain window on a working image
      // beats no image at all — so this is carried out as a warning.
      warning =
        "The window layout could not be applied, so the image opens as a plain folder. " +
        "Allow Lazify to control Finder in System Settings › Privacy & Security › " +
        "Automation, then build again.";
    }

    // After the layout, never before: Finder deletes `.VolumeIcon.icns` and
    // clears the custom-icon flag as it writes the window out.
    const iconSource =
      options.volumeIconPath && fs.existsSync(options.volumeIconPath)
        ? options.volumeIconPath
        : findBundleIcon(appPath, await readInfoPlist(appPath));

    if (iconSource && (await writeIcns(iconSource, path.join(mountPoint, ".VolumeIcon.icns")))) {
      await setCustomIconFlag(mountPoint);
    }

    await detachVolume(mountPoint);
    mountPoint = null;

    onProgress?.({ step: "compressing", detail: path.basename(outputPath) });

    // UDZO is the compressed read-only format a distributable DMG uses. The
    // headroom left above compresses away to nothing here.
    const convert = await run("hdiutil", [
      "convert",
      scratchImage,
      "-format",
      "UDZO",
      "-o",
      outputPath,
      // Overwrite: the save dialog already asked about replacing the file.
      "-ov"
    ]);

    if (convert.code !== 0) {
      return failed(convert.stderr.trim() || "Compressing the disk image failed.");
    }

    onProgress?.({ step: "done", detail: path.basename(outputPath) });

    return {
      success: true,
      outputPath,
      sizeBytes: fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0,
      message: null,
      warning
    };
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  } finally {
    // A volume left mounted by a build that threw is the one piece of mess here
    // the user would have to clear up by hand.
    if (mountPoint) await detachVolume(mountPoint);

    // The staged copy is a full duplicate of the app, and the scratch image is
    // another. Leaving them behind would fill the temp directory two copies at
    // a time.
    fs.rmSync(work, { recursive: true, force: true });
  }
}
