import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from "electron";
import path from "node:path";

import { CommandRunner } from "./command-runner";
import { listTemplates } from "./harmonizer";
import { scanEnvironment } from "./scanner";
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
    titleBarStyle: "hiddenInset",
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
