import { ipcMain } from "electron";

import {
	installExtension,
	listExtensions,
	refreshWrittenManifests,
	removeExtension,
	toggleExtension,
	writeProjectExtensionManifest,
} from "../extensions";

export function registerExtensionHandlers() {
	ipcMain.handle("lazify:list-extensions", async (_event, refresh?: boolean) =>
		listExtensions(refresh === true),
	);

	ipcMain.handle("lazify:install-extension", async (_event, id: string) => {
		const states = await installExtension(id);

		await refreshWrittenManifests();

		return states;
	});

	ipcMain.handle("lazify:remove-extension", async (_event, id: string) => {
		const states = await removeExtension(id);

		await refreshWrittenManifests();

		return states;
	});

	ipcMain.handle("lazify:toggle-extension", async (_event, id: string, enabled: boolean) => {
		const states = await toggleExtension(id, enabled);

		await refreshWrittenManifests();

		return states;
	});

	ipcMain.handle("lazify:write-extension-manifest", async (_event, projectPath: string) =>
		writeProjectExtensionManifest(projectPath),
	);
}
