import { readEnvironments, saveEnvironments } from "@/shared/lib/api-studio/environment-store";
import { readRouteDetails as readDetails, readRouteScan, saveRouteScan } from "@/shared/lib/api-studio/route-cache";
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
