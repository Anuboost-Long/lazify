import { allowHost, forgetHost, readAllowedHosts as readHosts } from "@/shared/lib/api-studio/allowed-hosts";
import { readEnvironments, saveEnvironments } from "@/shared/lib/api-studio/environment-store";
import { readRouteDetails as readDetails, readRouteScan, saveRouteScan } from "@/shared/lib/api-studio/route-cache";
import { sendApiRequest as sendRequest } from "@/shared/lib/api-studio/runner/send-request";
import type { ApiRequestDraft } from "@/shared/lib/api-studio/runner/types";
import { scanProjectRoutes as scanRoutes } from "@/shared/lib/api-studio/scan-project-routes";
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
