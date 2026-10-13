import { detectInstalledEditors } from "@/shared/lib/environment/editor-catalog";
import { installNvm, listNvmVersions, nvmSetDefault, nvmUse } from "@/shared/lib/environment/nvm-manager";
import { openInEditor } from "@/shared/lib/environment/open-in-editor";
import {
	killListeningProcess as reap,
	listListeningProcesses as listListening,
} from "@/shared/lib/environment/port-reaper";
import { checkToolUpdate, installTool, uninstallTool, updateTool } from "@/shared/lib/environment/tool-actions";
import { probeSingleTool, scanTools } from "@/shared/lib/environment/tool-scan";

import { listPtySessions } from "./terminal";

/** Scripts and agents Lazify started: killable, though they sit inside Lazify's own process tree. */
const managedRootPids = async () => (await listPtySessions()).map((session) => session.pid).filter((pid) => pid > 0);

export const listListeningProcesses = async () => listListening(await managedRootPids());

export const killListeningProcess = async (pid: number) => reap(pid, await managedRootPids());

export {
	checkToolUpdate,
	installNvm,
	installTool,
	nvmSetDefault,
	nvmUse,
	openInEditor,
	scanTools,
	uninstallTool,
	updateTool,
};

export const probeTool = probeSingleTool;
export const nvmListVersions = listNvmVersions;
export const detectEditors = detectInstalledEditors;
