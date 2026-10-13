import { appDataPath } from "@/platform/folders";
import path from "@/shared/lib/path";

export const extensionsRoot = async () => path.join(await appDataPath(), "extensions");

export const installedRecordPath = async () => path.join(await extensionsRoot(), "installed.json");

export const extensionDir = async (id: string, version: string) =>
	path.join(await extensionsRoot(), id, version);

export const unpackedDir = async (id: string, version: string) =>
	path.join(await extensionDir(id, version), "extension");
