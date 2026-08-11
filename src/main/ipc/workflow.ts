import { ipcMain } from "electron";
import type { IpcContext } from "./context";

export function registerWorkflowHandlers(ctx: IpcContext) {
  ipcMain.handle("lazify:run-command", async (_event, command: string, args: string[], cwd?: string) =>
    ctx.commandRunner.runCommand({ command, args, cwd })
  );

  ipcMain.handle("lazify:create-project", async (_event, payload) => ctx.workflowEngine.createProject(payload));

  ipcMain.handle("lazify:choose-command-option", async (_event, promptId: string, optionId: string) =>
    ctx.commandRunner.chooseCommandOption(promptId, optionId)
  );

  ipcMain.handle("lazify:install-package", async (_event, payload) => ctx.workflowEngine.installPackage(payload));
}
