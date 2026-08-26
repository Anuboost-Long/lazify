import { ipcRenderer } from "electron";

import type { AppBundleInfo, DmgProgress, DmgResult } from "../../main/dmg-compiler";
import { subscribe } from "./subscribe";
export const dmgApi = {
	selectAppBundle: (): Promise<string | null> => ipcRenderer.invoke("lazify:select-app-bundle"),
	selectDmgDestination: (suggestedPath: string): Promise<string | null> =>
		ipcRenderer.invoke("lazify:select-dmg-destination", suggestedPath),
	inspectAppBundle: (appPath: string): Promise<AppBundleInfo> =>
		ipcRenderer.invoke("lazify:inspect-app-bundle", appPath),
	defaultDmgPath: (appPath: string, suggestedFileName: string): Promise<string> =>
		ipcRenderer.invoke("lazify:default-dmg-path", appPath, suggestedFileName),
	selectDmgImage: (kind: "background" | "icon"): Promise<string | null> =>
		ipcRenderer.invoke("lazify:select-dmg-image", kind),
	dmgImagePreview: (imagePath: string, maxPixels?: number): Promise<string | null> =>
		ipcRenderer.invoke("lazify:dmg-image-preview", imagePath, maxPixels),
	compileDmg: (
		appPath: string,
		outputPath: string,
		volumeName?: string | null,
		backgroundImagePath?: string | null,
		volumeIconPath?: string | null,
	): Promise<DmgResult> =>
		ipcRenderer.invoke(
			"lazify:compile-dmg",
			appPath,
			outputPath,
			volumeName,
			backgroundImagePath,
			volumeIconPath,
		),
	onDmgProgress: (callback: (progress: DmgProgress) => void) =>
		subscribe("lazify:dmg-progress", callback),
};
