import { ipcMain } from "electron";

import {
	beginInstall,
	forgetInstallJob,
	installJobs,
	listExtensions,
	onInstallProgress,
	refreshWrittenManifests,
	removeExtension,
	toggleExtension,
	writeProjectExtensionManifest,
} from "../extensions";
import type { IpcContext } from "./context";

export function registerExtensionHandlers(ctx: IpcContext) {
	onInstallProgress((job) => ctx.emitToRenderer("lazify:extension-install", job));

	ipcMain.handle("lazify:list-extensions", async (_event, refresh?: boolean) =>
		listExtensions(refresh === true),
	);

	// The install answers with the job it started, not with the finished list:
	// what follows is tens of megabytes, and the window watches the progress
	// channel rather than holding a promise open across a page change.
	ipcMain.handle("lazify:install-extension", async (_event, id: string) => beginInstall(id));

	// What is already running, for a page that has just been opened.
	ipcMain.handle("lazify:extension-install-jobs", async () => installJobs());

	ipcMain.handle("lazify:remove-extension", async (_event, id: string) => {
		forgetInstallJob(id);

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
