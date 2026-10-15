import { allowHost, forgetHost, readAllowedHosts as readHosts } from "@/shared/lib/api-studio/allowed-hosts";
import { readEnvironments, saveEnvironments } from "@/shared/lib/api-studio/environment-store";
import { readRouteDetails as readDetails, readRouteScan, saveRouteScan } from "@/shared/lib/api-studio/route-cache";
import { runApiRequest as runRequest } from "@/shared/lib/api-studio/runner/run-request";
import { sendApiRequest as sendRequest } from "@/shared/lib/api-studio/runner/send-request";
import type { ApiRequestDraft } from "@/shared/lib/api-studio/runner/types";
import { scanProjectRoutes as scanRoutes } from "@/shared/lib/api-studio/scan-project-routes";
import {
	readScriptSettings as readSettings,
	saveScriptSettings as saveSettings,
	type ScriptSettings,
} from "@/shared/lib/api-studio/script-settings";
import type { ScriptedRunInput } from "@/shared/lib/api-studio/scripting/types";
import type { ApiEnvironmentSet } from "@/shared/lib/api-studio/types";

export async function scanProjectRoutes(projectPath: string) {
	return saveRouteScan(await scanRoutes(projectPath));
}

export function readProjectRoutes(projectPath: string) {
	return readRouteScan(projectPath);
}

export function readRouteDetails(projectPath: string, folder: string) {
	return readDetails(projectPath, folder);
}

export function readApiEnvironments(projectPath: string) {
	return readEnvironments(projectPath);
}

export function saveApiEnvironments(projectPath: string, set: ApiEnvironmentSet, secretNames: string[]) {
	return saveEnvironments(projectPath, set, secretNames);
}

export function sendApiRequest(draft: ApiRequestDraft) {
	return sendRequest(draft);
}

export function readAllowedHosts(projectPath: string) {
	return readHosts(projectPath);
}

export function allowApiHost(projectPath: string, url: string) {
	return allowHost(projectPath, url);
}

export function forgetApiHost(projectPath: string, host: string) {
	return forgetHost(projectPath, host);
}

export function runApiRequest(input: ScriptedRunInput) {
	return runRequest(input);
}

export function readScriptSettings(projectPath: string) {
	return readSettings(projectPath);
}

export function saveScriptSettings(projectPath: string, settings: ScriptSettings) {
	return saveSettings(projectPath, settings);
}
