import { dialog, ipcMain } from "electron";
import type { OpenDialogOptions } from "electron";
import { readProjectAssetFile } from "../projects/project-asset-reader";
import { getNpmAudit, getNpmOutdated } from "../projects/project-health";
import { importProjectFromDirectory } from "../projects/project-importer";
import { importProjectIndexFromDirectory, readImportedProjectFile } from "../projects/project-importer-optimized";
import type { IpcContext } from "./context";

export function registerProjectHandlers(ctx: IpcContext) {
  ipcMain.handle("lazify:select-directory", async () => {
    const options: OpenDialogOptions = {
      title: "Choose project directory",
      properties: ["openDirectory", "createDirectory"]
    };
    const result = ctx.mainWindow
      ? await dialog.showOpenDialog(ctx.mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0] ?? null;
  });

  ipcMain.handle("lazify:select-directories", async () => {
    const options: OpenDialogOptions = {
      title: "Choose project directories",
      properties: ["openDirectory", "createDirectory", "multiSelections"]
    };
    const result = ctx.mainWindow
      ? await dialog.showOpenDialog(ctx.mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled) {
      return [];
    }

    return result.filePaths;
  });

  // Finder picker for handing a path to an agent: files and folders are both
  // valid targets, and several can be picked in one trip. On Windows and Linux
  // the two file properties cannot be combined, so those pick files only.
  ipcMain.handle("lazify:select-paths", async (_event, defaultPath?: string | null) => {
    const options: OpenDialogOptions = {
      title: "Choose a file or folder",
      defaultPath: defaultPath ?? undefined,
      properties:
        process.platform === "darwin"
          ? ["openFile", "openDirectory", "multiSelections"]
          : ["openFile", "multiSelections"]
    };
    const result = ctx.mainWindow
      ? await dialog.showOpenDialog(ctx.mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled) {
      return [];
    }

    return result.filePaths;
  });

  ipcMain.handle("lazify:import-project-from-directory", async (_event, projectPath: string) =>
    importProjectFromDirectory(projectPath)
  );

  ipcMain.handle("lazify:import-project-index-from-directory", async (_event, projectPath: string) =>
    importProjectIndexFromDirectory(projectPath)
  );

  ipcMain.handle("lazify:read-imported-project-file", async (_event, filePath: string) =>
    readImportedProjectFile(filePath)
  );

  ipcMain.handle("lazify:read-project-asset-file", async (_event, filePath: string) =>
    readProjectAssetFile(filePath)
  );

  ipcMain.handle("lazify:npm-outdated", async (_event, projectPath: string) =>
    getNpmOutdated(projectPath)
  );

  ipcMain.handle("lazify:npm-audit", async (_event, projectPath: string) =>
    getNpmAudit(projectPath)
  );
}
