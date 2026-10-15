import { readRouteDetails as readDetails, readRouteScan, saveRouteScan } from "@/shared/lib/api-studio/route-cache";
import { scanProjectRoutes as scanRoutes } from "@/shared/lib/api-studio/scan-project-routes";

export async function scanProjectRoutes(projectPath: string) {
	return saveRouteScan(await scanRoutes(projectPath));
}

export function readProjectRoutes(projectPath: string) {
	return readRouteScan(projectPath);
}

export function readRouteDetails(projectPath: string, folder: string) {
	return readDetails(projectPath, folder);
}
