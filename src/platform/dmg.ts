import { desktop } from "@chain/sdk";

import { compileDmg as compile, defaultOutputPath } from "@/shared/lib/dmg";
import type { CompileDmgOptions, DmgProgress, DmgResult } from "@/shared/lib/dmg/types";
import path from "@/shared/lib/path";

export { inspectAppBundle, readImagePreview as dmgImagePreview } from "@/shared/lib/dmg";
export type { AppBundleInfo, DmgProgress, DmgResult } from "@/shared/lib/dmg/types";

async function pickFile(): Promise<string | null> {
	const [grant] = await desktop.folders.pick({ files: true });

	return grant?.path ?? null;
}

/** A single `.app`, however the picker's own package-bundle handling shows it. */
export const selectAppBundle = () => pickFile();

/**
 * No save dialog exists to ask for a new filename in a chosen folder — the
 * picker is for existing paths. So this picks a destination folder and keeps
 * the suggested filename; the output path is already a plain editable text
 * field in the form this fills in, so a different name is still one edit away.
 */
export async function selectDmgDestination(suggestedPath: string): Promise<string | null> {
	const [grant] = await desktop.folders.pick({ files: false });

	return grant ? path.join(grant.path, path.basename(suggestedPath)) : null;
}

export const selectDmgImage = (_kind: "background" | "icon") => pickFile();

/**
 * The window's native drop handler takes every file drop before the page
 * sees it, so a DOM `File` never carries a path here — Electron's own answer
 * for a file with no path on disk. Drops arrive through `onAppDropped`.
 */
export const pathForDroppedFile = (_file: File) => "";

/** The first thing dropped on the window, granted, while subscribed. */
export function onAppDropped(callback: (appPath: string) => void): () => void {
	return desktop.folders.onDrop(([first]) => {
		if (first) callback(first.path);
	});
}

export const defaultDmgPath = async (appPath: string, suggestedFileName: string) =>
	defaultOutputPath(appPath, suggestedFileName);

const progressListeners = new Set<(progress: DmgProgress) => void>();

export function onDmgProgress(callback: (progress: DmgProgress) => void): () => void {
	progressListeners.add(callback);

	return () => {
		progressListeners.delete(callback);
	};
}

export function compileDmg(
	appPath: string,
	outputPath: string,
	volumeName?: string | null,
	backgroundImagePath?: string | null,
	volumeIconPath?: string | null,
): Promise<DmgResult> {
	const options: CompileDmgOptions = { appPath, outputPath, volumeName, backgroundImagePath, volumeIconPath };

	return compile(options, (progress) => progressListeners.forEach((listener) => listener(progress)));
}
