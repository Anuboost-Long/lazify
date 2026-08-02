import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { run } from "./run";

/** Everything that goes through `sips` — previews, conversions, pixel sizes. */

/**
 * Any image `sips` can read, as a PNG data URL no wider than `maxPixels`.
 *
 * Shared by the app icon in the header and the thumbnails beside the two image
 * pickers, so what the page shows always came through the same tool that will
 * package it — an image `sips` chokes on shows as nothing here rather than
 * previewing fine and failing during the build.
 */
export async function readImagePreview(
  imagePath: string,
  maxPixels = 128
): Promise<string | null> {
  if (!imagePath || !fs.existsSync(imagePath)) return null;

  // `sips` writes to a file rather than stdout, so it needs somewhere to put it.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-icon-"));
  const png = path.join(scratch, "preview.png");

  try {
    const { code } = await run("sips", [
      "-s",
      "format",
      "png",
      "-Z",
      String(maxPixels),
      imagePath,
      "--out",
      png
    ]);

    if (code !== 0 || !fs.existsSync(png)) return null;

    return `data:image/png;base64,${fs.readFileSync(png).toString("base64")}`;
  } catch {
    return null;
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

/** The pixel size of an image, or null when `sips` cannot read one. */
export async function imagePixelSize(
  imagePath: string
): Promise<{ width: number; height: number } | null> {
  try {
    const { code, stdout } = await run("sips", [
      "-g",
      "pixelWidth",
      "-g",
      "pixelHeight",
      imagePath
    ]);
    if (code !== 0) return null;

    const width = Number(/pixelWidth:\s*(\d+)/.exec(stdout)?.[1]);
    const height = Number(/pixelHeight:\s*(\d+)/.exec(stdout)?.[1]);

    return width > 0 && height > 0 ? { width, height } : null;
  } catch {
    return null;
  }
}

/**
 * Writes `source` to `destination` as a PNG.
 *
 * Normalised whatever came in: Finder will happily take a JPEG as a backdrop,
 * but only PNG carries the transparency a backdrop tends to want.
 */
export async function writePng(source: string, destination: string): Promise<boolean> {
  const { code } = await run("sips", ["-s", "format", "png", source, "--out", destination]);

  return code === 0 && fs.existsSync(destination);
}

/**
 * Writes `source` to `destination` as an `.icns`.
 *
 * An `.icns` copies straight through; anything else is squared off at 512 first,
 * which is the size `sips` will actually write an icns from.
 */
export async function writeIcns(source: string, destination: string): Promise<boolean> {
  const { code } = source.toLowerCase().endsWith(".icns")
    ? await run("ditto", [source, destination])
    : await run("sips", [
        "-s",
        "format",
        "icns",
        "-z",
        "512",
        "512",
        source,
        "--out",
        destination
      ]);

  return code === 0 && fs.existsSync(destination);
}
