import { appTempPath, createFolder, deletePath, pathExists, readFileBytes } from "@/platform/folders";
import { pathExistsOnDisk } from "@/platform/exec";
import path from "@/shared/lib/path";

import { run } from "./run";

/** Everything that goes through `sips` — previews, conversions, pixel sizes. */

/** Chunked so a real-sized image doesn't blow the call stack `String.fromCodePoint` would take spread. */
function toBase64(bytes: Uint8Array): string {
	let binary = "";

	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCodePoint(...bytes.subarray(index, index + 0x8000));
	}

	return btoa(binary);
}

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
	maxPixels = 128,
): Promise<string | null> {
	if (!imagePath || !(await pathExists(imagePath))) return null;

	// `sips` writes to a file rather than stdout, so it needs somewhere to put it.
	const scratch = path.join(await appTempPath(), `lazify-icon-${crypto.randomUUID()}`);
	const png = path.join(scratch, "preview.png");

	try {
		await createFolder(scratch);

		const { code } = await run("sips", ["-s", "format", "png", "-Z", String(maxPixels), imagePath, "--out", png]);

		if (code !== 0 || !(await pathExists(png))) return null;

		return `data:image/png;base64,${toBase64(await readFileBytes(png))}`;
	} catch {
		return null;
	} finally {
		await deletePath(scratch).catch(() => undefined);
	}
}

/** The pixel size of an image, or null when `sips` cannot read one. */
export async function imagePixelSize(
	imagePath: string,
): Promise<{ width: number; height: number } | null> {
	try {
		const { code, stdout } = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", imagePath]);

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

	return code === 0 && (await pathExists(destination));
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
		: await run("sips", ["-s", "format", "icns", "-z", "512", "512", source, "--out", destination]);

	// Not `pathExists`: the destination can be a freshly mounted DMG volume,
	// outside every folder the app was granted. `ditto`/`sips` already wrote
	// it unrestricted through process-runner; this check must be unrestricted too.
	return code === 0 && (await pathExistsOnDisk(destination));
}
