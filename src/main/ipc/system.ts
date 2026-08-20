import { ipcMain, shell } from "electron";
import fs from "node:fs";
import { getDiagnosticsPaths } from "../diagnostics/logger";
import { detectEditors } from "../environment/editor-catalog";
import { openInEditor, type OpenInEditorRequest } from "../environment/open-in-editor";
import { openTerminal } from "../environment/open-terminal";
import { killListeningProcess, listListeningProcesses } from "../environment/port-reaper";
import { applyZoom, readZoom, resetZoom, stepZoom } from "../window-zoom";
import type { IpcContext } from "./context";

export function registerSystemHandlers(ctx: IpcContext) {
  ipcMain.handle("lazify:diagnostics-paths", () => getDiagnosticsPaths());

  ipcMain.handle("lazify:read-zoom", () => readZoom());

  ipcMain.handle("lazify:set-zoom", (_event, factor: number) =>
    applyZoom(ctx.mainWindow, factor)
  );

  ipcMain.handle("lazify:step-zoom", (_event, direction: 1 | -1) =>
    stepZoom(ctx.mainWindow, direction)
  );

  ipcMain.handle("lazify:reset-zoom", () => resetZoom(ctx.mainWindow));

  // "Reveal in Finder" from a tree's right-click menu: a folder opens in the OS
  // file manager, a file is revealed selected inside its folder. A path that is
  // not on disk yet — a tree entry created but never written — is left alone.
  ipcMain.handle("lazify:reveal-in-file-manager", async (_event, targetPath: string) => {
    if (!targetPath || !fs.existsSync(targetPath)) {
      return;
    }

    if (fs.statSync(targetPath).isDirectory()) {
      await shell.openPath(targetPath);
      return;
    }

    shell.showItemInFolder(targetPath);
  });

  // Which editors this machine actually has, so the setting can offer them
  // rather than ask the user to remember a command.
  ipcMain.handle("lazify:detect-editors", async () => detectEditors());

  // A source link, opened in whatever the user said their editor is: their own
  // command when they set one, the OS default when they did not.
  ipcMain.handle("lazify:open-in-editor", async (_event, request: OpenInEditorRequest) =>
    openInEditor(request)
  );

  // "Console" from a project's tool rail: the OS terminal, opened rooted at
  // that project's folder.
  ipcMain.handle("lazify:open-terminal", async (_event, targetPath: string) => {
    openTerminal(targetPath);
  });

  // ── DMG compiler ──────────────────────────────────────────────────────────
  // A `.app` in, a `.dmg` out. Both pickers live here because the dialogs need
  // the window to hang off, and the save dialog is also what asks about
  // replacing a file that already exists.

  // The PTY pids let the reaper tell a script Lazify started apart from
  // Lazify's own processes, which it must never offer to kill.
  const managedRootPids = () => ctx.ptyRunner.getSessions().map((session) => session.pid);

  ipcMain.handle("lazify:listening-processes", async () =>
    listListeningProcesses(managedRootPids())
  );

  ipcMain.handle("lazify:kill-listening-process", async (_event, pid: number) =>
    killListeningProcess(pid, managedRootPids())
  );
}
