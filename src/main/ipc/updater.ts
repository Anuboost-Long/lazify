import { ipcMain } from "electron";
import { checkForUpdates, downloadUpdate, getUpdateState, quitAndInstall } from "../updater";

export function registerUpdaterHandlers() {
  ipcMain.handle("lazify:update-state", () => getUpdateState());
  ipcMain.handle("lazify:check-for-updates", async () => checkForUpdates());
  ipcMain.handle("lazify:download-update", async () => downloadUpdate());
  ipcMain.handle("lazify:quit-and-install-update", () => quitAndInstall());
}
