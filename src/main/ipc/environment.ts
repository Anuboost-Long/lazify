import { app, ipcMain } from "electron";
import { checkToolUpdate, installNvm, installTool, listNvmVersions, nvmSetDefault, nvmUse, probeSingleTool, scanTools, uninstallTool, updateTool } from "../environment/environment-scanner";
import { scanEnvironment } from "../environment/scanner";

export function registerEnvironmentHandlers() {
  ipcMain.handle("lazify:environment", async () => scanEnvironment());

  ipcMain.handle("lazify:scan-tools", async (_event, force = false) => scanTools(force as boolean));
  ipcMain.handle("lazify:probe-tool", async (_event, name: string) => probeSingleTool(name));
  ipcMain.handle("lazify:nvm-list-versions", async () => listNvmVersions());
  ipcMain.handle("lazify:install-nvm", async () => installNvm());
  ipcMain.handle("lazify:nvm-set-default", async (_event, version: string) => nvmSetDefault(version));
  ipcMain.handle("lazify:nvm-use", async (_event, version: string) => nvmUse(version));
  ipcMain.handle("lazify:install-tool", async (_event, toolName: string) => installTool(toolName));
  ipcMain.handle("lazify:uninstall-tool", async (_event, toolName: string) => uninstallTool(toolName));
  ipcMain.handle("lazify:check-tool-update", async (_event, toolName: string, currentVersion: string) => checkToolUpdate(toolName, currentVersion));
  ipcMain.handle("lazify:update-tool", async (_event, toolName: string) => updateTool(toolName));
  ipcMain.handle("lazify:relaunch", () => { app.relaunch(); app.exit(0); });
}
