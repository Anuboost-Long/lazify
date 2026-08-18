import { ipcMain } from "electron";

import { readEnvironments, saveEnvironments } from "../api-studio/environment-store";
import { readRouteDetails, readRouteScan, saveRouteScan } from "../api-studio/route-cache";
import { scanProjectRoutes } from "../api-studio";

export function registerApiStudioHandlers() {
  ipcMain.handle("lazify:scan-project-routes", async (_event, projectPath: string) =>
    saveRouteScan(await scanProjectRoutes(projectPath))
  );

  ipcMain.handle("lazify:read-project-routes", async (_event, projectPath: string) =>
    readRouteScan(projectPath)
  );

  ipcMain.handle(
    "lazify:read-route-details",
    async (_event, projectPath: string, folder: string) => readRouteDetails(projectPath, folder)
  );

  ipcMain.handle("lazify:read-api-environments", async (_event, projectPath: string) =>
    readEnvironments(projectPath)
  );

  ipcMain.handle(
    "lazify:save-api-environments",
    async (
      _event,
      projectPath: string,
      set: import("../api-studio/types").ApiEnvironmentSet,
      secretNames: string[]
    ) => saveEnvironments(projectPath, set, secretNames)
  );
}
