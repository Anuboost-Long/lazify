import { ipcMain } from "electron";
import { getFileDiff, getWorkingChanges } from "../agents/agent-changes";
import { commitChanges, discardChanges, pushCurrentBranch, stageFiles, unstageFiles } from "../projects/git-actions";
import { checkoutProjectBranch, getProjectGitStatus } from "../projects/project-git-status";

export function registerGitHandlers() {
  ipcMain.handle("lazify:project-git-status", async (_event, projectPath: string) =>
    getProjectGitStatus(projectPath)
  );

  ipcMain.handle("lazify:working-changes", async (_event, projectPath: string) =>
    getWorkingChanges(projectPath)
  );

  ipcMain.handle(
    "lazify:file-diff",
    async (_event, projectPath: string, filePath: string, fullFile?: boolean) =>
      getFileDiff(projectPath, filePath, fullFile)
  );

  ipcMain.handle("lazify:checkout-branch", async (_event, projectPath: string, branch: string) =>
    checkoutProjectBranch(projectPath, branch)
  );

  ipcMain.handle("lazify:stage-files", async (_event, projectPath: string, paths: string[]) =>
    stageFiles(projectPath, paths)
  );

  ipcMain.handle("lazify:unstage-files", async (_event, projectPath: string, paths: string[]) =>
    unstageFiles(projectPath, paths)
  );

  ipcMain.handle("lazify:discard-changes", async (_event, projectPath: string, paths: string[]) =>
    discardChanges(projectPath, paths)
  );

  ipcMain.handle("lazify:commit-changes", async (_event, projectPath: string, message: string) =>
    commitChanges(projectPath, message)
  );

  ipcMain.handle("lazify:push-branch", async (_event, projectPath: string) =>
    pushCurrentBranch(projectPath)
  );
}
