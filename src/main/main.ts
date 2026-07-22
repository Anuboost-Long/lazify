import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from "electron";
import fs from "node:fs";
import path from "node:path";

import type { ProjectTreeNode, InstalledPackage } from "../renderer/shared/types/lazify";
import { CommandRunner } from "./command-runner";
import { PtyRunner } from "./pty-runner";
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
import { getFileDiff, getWorkingChanges } from "./agent-changes";
import { getNpmOutdated, getNpmAudit } from "./project-health";
import { choosePackageManager, scanEnvironment } from "./scanner";
import { resolveDevPortInjection } from "./dev-port";
import { scanTools, probeSingleTool, listNvmVersions, installNvm, nvmSetDefault, nvmUse, installTool, checkToolUpdate, updateTool, scanListeningPorts, buildProcessTree, getDescendantPids } from "./environment-scanner";
import { listTemplatePackageEntries } from "./template-package-manifest";
import { WorkflowEngine } from "./workflow-engine";
import { getAgentDefinition, listAgents } from "./agents/agent-registry";
import { addCustomAgent, removeCustomAgent, type CustomAgentInput } from "./agents/custom-agents-store";
import { getAgentUsage } from "./agents/agent-usage";
import { setAgentBudget } from "./agents/agent-limits-store";
import { matchPackageVersions } from "../brain/package-version-matcher";
import { normalizeRuntimePath } from "./runtime-path";

let mainWindow: BrowserWindow | null = null;

const emitToRenderer = (channel: string, payload: unknown) => {
  mainWindow?.webContents.send(channel, payload);
};

const commandRunner = new CommandRunner((event) => emitToRenderer("lazify:log", event));
const workflowEngine = new WorkflowEngine(commandRunner, (event) =>
  emitToRenderer("lazify:workflow-progress", event)
);
const ptyRunner = new PtyRunner(
  (event) => emitToRenderer("lazify:pty-data", event),
  (event) => emitToRenderer("lazify:script-status", event)
);

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#efe7dc",
    icon: path.join(app.getAppPath(), "build/icon.png"),
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

  ipcMain.handle("lazify:scan-tools", async (_event, force = false) => scanTools(force as boolean));
  ipcMain.handle("lazify:probe-tool", async (_event, name: string) => probeSingleTool(name));
  ipcMain.handle("lazify:nvm-list-versions", async () => listNvmVersions());
  ipcMain.handle("lazify:install-nvm", async () => installNvm());
  ipcMain.handle("lazify:nvm-set-default", async (_event, version: string) => nvmSetDefault(version));
  ipcMain.handle("lazify:nvm-use", async (_event, version: string) => nvmUse(version));
  ipcMain.handle("lazify:install-tool", async (_event, toolName: string) => installTool(toolName));
  ipcMain.handle("lazify:check-tool-update", async (_event, toolName: string, currentVersion: string) => checkToolUpdate(toolName, currentVersion));
  ipcMain.handle("lazify:update-tool", async (_event, toolName: string) => updateTool(toolName));
  ipcMain.handle("lazify:relaunch", () => { app.relaunch(); app.exit(0); });

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

  ipcMain.handle("lazify:working-changes", async (_event, projectPath: string) =>
    getWorkingChanges(projectPath)
  );

  ipcMain.handle("lazify:file-diff", async (_event, projectPath: string, filePath: string) =>
    getFileDiff(projectPath, filePath)
  );

  ipcMain.handle("lazify:npm-outdated", async (_event, projectPath: string) =>
    getNpmOutdated(projectPath)
  );

  ipcMain.handle("lazify:npm-audit", async (_event, projectPath: string) =>
    getNpmAudit(projectPath)
  );

  ipcMain.handle("lazify:list-scripts", async (_event, projectPath: string): Promise<Record<string, string>> => {
    const pkgJsonPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(pkgJsonPath)) return {};
    const raw = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
    return (raw.scripts ?? {}) as Record<string, string>;
  });

  ipcMain.handle("lazify:run-script", async (_event, projectPath: string, scriptName: string, cols = 220, rows = 50): Promise<{ runId: string; ptyAvailable: boolean }> => {
    const packageManager = choosePackageManager(projectPath);
    // If this dev script's port is already taken, step up to the next free one.
    const { extraArgs, env } = await resolveDevPortInjection(projectPath, scriptName, packageManager);
    const args = [...(packageManager === "yarn" ? [scriptName] : ["run", scriptName]), ...extraArgs];

    if (ptyRunner.available) {
      const runId = ptyRunner.start(packageManager, args, projectPath, scriptName, cols as number, rows as number, env);
      return { runId, ptyAvailable: true };
    }

    // Fallback: spawn without PTY (no interactive output)
    const runId = commandRunner.startScript(
      { command: packageManager, args, cwd: projectPath, env },
      (event) => emitToRenderer("lazify:pty-data", { runId: event.id, data: event.message }),
      (id, exitCode) => emitToRenderer("lazify:script-status", { runId: id, scriptName, exitCode, status: exitCode === 0 ? "done" : "error" })
    );
    emitToRenderer("lazify:script-status", { runId, scriptName, exitCode: null, status: "running" });
    return { runId, ptyAvailable: false };
  });

  ipcMain.handle("lazify:stop-script", async (_event, runId: string): Promise<void> => {
    if (runId.startsWith("pty-")) {
      ptyRunner.kill(runId);
    } else {
      commandRunner.stopScript(runId);
    }
  });

  ipcMain.handle("lazify:list-sessions", async () => {
    const sessions = ptyRunner.getSessions();
    if (sessions.length === 0) return [];

    const [ports, tree] = await Promise.all([scanListeningPorts(), buildProcessTree()]);

    return sessions.map((s) => {
      const descendants = getDescendantPids(s.pid, tree);
      const sessionPorts = ports
        .filter((p) => descendants.has(p.pid))
        .map((p) => ({ port: p.port, command: p.command, address: p.address }));
      return { ...s, ports: sessionPorts };
    });
  });

  // Fire-and-forget — no invoke/handle round-trip needed for input
  ipcMain.on("lazify:pty-write", (_event, runId: string, data: string) => {
    ptyRunner.write(runId, data);
  });

  ipcMain.handle("lazify:pty-backlog", async (_event, runId: string) => ptyRunner.getBacklog(runId));

  ipcMain.on("lazify:pty-resize", (_event, runId: string, cols: number, rows: number) => {
    ptyRunner.resize(runId, cols, rows);
  });

  ipcMain.handle("lazify:list-agents", async () => listAgents());

  ipcMain.handle("lazify:add-custom-agent", async (_event, input: CustomAgentInput) =>
    addCustomAgent(input)
  );

  ipcMain.handle("lazify:agent-usage", async (_event, sinceIso?: string) =>
    getAgentUsage(sinceIso)
  );

  ipcMain.handle(
    "lazify:set-agent-budget",
    async (_event, agentId: string, weeklyTokens: number) =>
      setAgentBudget(agentId, weeklyTokens)
  );

  ipcMain.handle("lazify:remove-custom-agent", async (_event, agentId: string) =>
    removeCustomAgent(agentId)
  );

  // Agents are plain interactive CLIs: run them in a PTY and let xterm render.
  // Input, resize, and teardown reuse the existing pty-write/resize/stop-script channels.
  ipcMain.handle(
    "lazify:open-agent-terminal",
    async (_event, agentId: string, projectPath: string, cols = 120, rows = 30): Promise<{ runId: string }> => {
      const definition = getAgentDefinition(agentId);

      if (!definition) {
        throw new Error(`Unknown agent: ${agentId}`);
      }

      if (!ptyRunner.available) {
        throw new Error("node-pty is not available. Run: npm run rebuild");
      }

      const runId = ptyRunner.start(
        definition.binary,
        definition.args,
        projectPath,
        definition.label,
        cols as number,
        rows as number
      );

      return { runId };
    }
  );

  ipcMain.handle("lazify:list-project-packages", async (_event, projectPath: string): Promise<InstalledPackage[]> => {
    const pkgJsonPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(pkgJsonPath)) return [];
    const raw = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
    const deps = Object.entries((raw.dependencies ?? {}) as Record<string, string>).map(([name, versionSpec]) => ({ name, versionSpec, isDev: false }));
    const devDeps = Object.entries((raw.devDependencies ?? {}) as Record<string, string>).map(([name, versionSpec]) => ({ name, versionSpec, isDev: true }));
    return [...deps, ...devDeps];
  });

  ipcMain.handle("lazify:add-project-package", async (_event, payload: { projectPath: string; packageName: string; dev?: boolean }) =>
    workflowEngine.addProjectPackage(payload)
  );

  ipcMain.handle("lazify:remove-project-package", async (_event, payload: { projectPath: string; packageName: string }) =>
    workflowEngine.removeProjectPackage(payload)
  );

  ipcMain.handle("lazify:install-project-dependencies", async (_event, projectPath: string) =>
    workflowEngine.installProjectDependencies(projectPath)
  );

  ipcMain.handle("lazify:match-package-versions", async (_event, projectPath: string) =>
    matchPackageVersions({ projectPath, dryRun: true })
  );

  ipcMain.handle("lazify:fix-project-package-versions", async (_event, projectPath: string) => {
    const report = await matchPackageVersions({ projectPath });
    if (!report.installPlan.length) {
      return { success: true, message: "All packages are already compatible.", projectPath };
    }
    return workflowEngine.installPackage({
      packageName: report.installPlan.join(","),
      baseDirectory: path.dirname(projectPath),
      projectName: path.basename(projectPath)
    });
  });

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
  normalizeRuntimePath();

  if (process.platform === "darwin") {
    app.dock.setIcon(path.join(app.getAppPath(), "build/icon.png"));
  }

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
