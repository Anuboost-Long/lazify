import { ipcMain } from "electron";

import type { EnvVariablePatch } from "../../renderer/shared/types/lazify";
import {
  addEnvVariable,
  createProjectEnvFile,
  deleteEnvVariable,
  listProjectEnvFiles,
  readProjectEnvFile,
  updateEnvVariable
} from "../projects/env";

export function registerEnvFileHandlers() {
  ipcMain.handle("lazify:list-env-files", async (_event, projectPath: string) =>
    listProjectEnvFiles(projectPath)
  );

  ipcMain.handle("lazify:read-env-file", async (_event, projectPath: string, fileName: string) =>
    readProjectEnvFile(projectPath, fileName)
  );

  ipcMain.handle(
    "lazify:update-env-variable",
    async (_event, projectPath: string, fileName: string, line: number, expectedKey: string, patch: EnvVariablePatch) =>
      updateEnvVariable(projectPath, fileName, line, expectedKey, patch)
  );

  ipcMain.handle(
    "lazify:delete-env-variable",
    async (_event, projectPath: string, fileName: string, line: number, expectedKey: string) =>
      deleteEnvVariable(projectPath, fileName, line, expectedKey)
  );

  ipcMain.handle(
    "lazify:add-env-variable",
    async (_event, projectPath: string, fileName: string, key: string, value: string) =>
      addEnvVariable(projectPath, fileName, key, value)
  );

  ipcMain.handle("lazify:create-env-file", async (_event, projectPath: string, fileName: string) =>
    createProjectEnvFile(projectPath, fileName)
  );
}
