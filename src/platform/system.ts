import path from "@/shared/lib/path";
import { uniqueId } from "@/shared/lib/unique-id";

import { ExecFileError, execFile } from "./exec";
import { appTempPath, createFolder, deletePath } from "./folders";

const OPENABLE_URL = /^(https?:|mailto:)/i;

export async function openExternalUrl(url: string): Promise<void> {
	if (!OPENABLE_URL.test(url)) throw new Error(`Only web and mail links can be opened: ${url}`);
	await execFile("open", [url]);
}

export async function revealInFileManager(targetPath: string): Promise<void> {
	await execFile("open", ["-R", targetPath]);
}

export async function openTerminal(targetPath: string): Promise<void> {
	await execFile("open", ["-a", "Terminal", targetPath]);
}

/**
 * Electron restarts so a freshly installed nvm reaches its main process's PATH.
 * Here every tool runs through a new login shell already, and the scans' caches
 * live in the page, so a reload is the whole restart. Terminals survive it.
 */
export async function relaunchApp(): Promise<void> {
	globalThis.location.reload();
}

const WRITE_CLIPBOARD_PNG = [
	"on run argv",
	"set target to open for access POSIX file (item 1 of argv) with write permission",
	"try",
	"write (the clipboard as «class PNGf») to target",
	"on error message number code",
	"close access target",
	"error message number code",
	"end try",
	"close access target",
	"end run",
].flatMap((line) => ["-e", line]);

/** AppleScript's "Can't make some data into the expected type": text, a file, or nothing. */
const NO_IMAGE_ON_CLIPBOARD = "(-1700)";

/**
 * Saves a copied image as a PNG so a terminal can be handed its path, or null
 * when the clipboard holds no image. macOS converts TIFF and the rest to PNG.
 */
export async function saveClipboardImage(): Promise<string | null> {
	const folder = path.join(await appTempPath(), uniqueId("lazify-paste"));
	const filePath = path.join(folder, "screenshot.png");

	await createFolder(folder);

	try {
		await execFile("osascript", [...WRITE_CLIPBOARD_PNG, filePath]);

		return filePath;
	} catch (error) {
		await deletePath(folder);
		if (error instanceof ExecFileError && error.stderr.includes(NO_IMAGE_ON_CLIPBOARD)) return null;
		throw error;
	}
}
