import path from "node:path";

import { app } from "electron";

export const extensionsRoot = () => path.join(app.getPath("userData"), "extensions");

export const installedRecordPath = () => path.join(extensionsRoot(), "installed.json");

export const extensionDir = (id: string, version: string) =>
	path.join(extensionsRoot(), id, version);

export const unpackedDir = (id: string, version: string) =>
	path.join(extensionDir(id, version), "extension");
