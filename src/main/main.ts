import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from "electron";
import path from "node:path";

import type { ProjectTreeNode } from "../renderer/shared/types/lazify";
import { CommandRunner } from "./command-runner";
import { getTemplate, listTemplates } from "./harmonizer";
import {
  deleteImportedTemplate,
  getImportedTemplate,
  listImportedTemplates,
  saveImportedTemplateFromProject,
  updateImportedTemplate
} from "./imported-template-store";
import { searchNpmPackages } from "./npm-registry";
import { importProjectFromDirectory } from "./project-importer";
import {
  importProjectIndexFromDirectory,
  readImportedProjectFile
} from "./project-importer-optimized";
import { getProjectGitStatus } from "./project-git-status";
import { scanEnvironment } from "./scanner";
import { listTemplatePackageEntries } from "./template-package-manifest";
import { WorkflowEngine } from "./workflow-engine";

let mainWindow: BrowserWindow | null = null;

const emitToRenderer = (channel: string, payload: unknown) => {
  mainWindow?.webContents.send(channel, payload);
};

const commandRunner = new CommandRunner((event) => emitToRenderer("lazify:log", event));
const workflowEngine = new WorkflowEngine(commandRunner, (event) =>
  emitToRenderer("lazify:workflow-progress", event)
);

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#efe7dc",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(path.join(app.getAppPath(), "dist/index.html"));
  }

  return window;
}

function registerIpcHandlers() {
  ipcMain.handle("lazify:run-command", async (_event, command: string, args: string[], cwd?: string) =>
    commandRunner.runCommand({ command, args, cwd })
  );

  ipcMain.handle("lazify:create-project", async (_event, payload) => workflowEngine.createProject(payload));

  ipcMain.handle("lazify:install-package", async (_event, payload) => workflowEngine.installPackage(payload));

  ipcMain.handle("lazify:environment", async () => scanEnvironment());

  ipcMain.handle("lazify:templates", async () => listTemplates());
  ipcMain.handle("lazify:imported-templates", async () => listImportedTemplates());
  ipcMain.handle("lazify:imported-template", async (_event, templateId: string) =>
    getImportedTemplate(templateId)
  );
  ipcMain.handle(
    "lazify:update-imported-template",
    async (
      _event,
      templateId: string,
      updates: { name?: string | null; tree?: ProjectTreeNode[] | null }
    ) => updateImportedTemplate(templateId, updates)
  );
  ipcMain.handle("lazify:delete-imported-template", async (_event, templateId: string) =>
    deleteImportedTemplate(templateId)
  );

  ipcMain.handle("lazify:template-package-manifest", async (_event, templateId: string) =>
    listTemplatePackageEntries(getTemplate(templateId))
  );

  ipcMain.handle("lazify:search-npm-packages", async (_event, query: string) =>
    searchNpmPackages(query)
  );

  ipcMain.handle("lazify:select-directory", async () => {
    const options: OpenDialogOptions = {
      title: "Choose project directory",
      properties: ["openDirectory", "createDirectory"]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled) {
      return null;
    }

    return result.filePaths[0] ?? null;
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

  ipcMain.handle("lazify:project-git-status", async (_event, projectPath: string) =>
    getProjectGitStatus(projectPath)
  );

  ipcMain.handle(
    "lazify:save-imported-template",
    async (
      _event,
      projectPath: string,
      includedRelativePaths: string[],
      providedName?: string | null,
      confirmedStack?: string | null
    ) =>
      saveImportedTemplateFromProject(
        projectPath,
        includedRelativePaths,
        providedName,
        confirmedStack
      )
  );
}

app.whenReady().then(() => {
  registerIpcHandlers();
  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
