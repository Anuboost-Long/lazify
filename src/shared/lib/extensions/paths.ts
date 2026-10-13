import { appDataPath } from "@/platform/folders";
import path from "@/shared/lib/path";

export const extensionsRoot = async () => path.join(await appDataPath(), "extensions");

export const installedRecordPath = async () => path.join(await extensionsRoot(), "installed.json");
