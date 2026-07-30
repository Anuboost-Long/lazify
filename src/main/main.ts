import { app, BrowserWindow, dialog, ipcMain, Notification, shell, type OpenDialogOptions } from "electron";
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
import { checkoutProjectBranch, getProjectGitStatus } from "./project-git-status";
import {
  commitChanges,
  discardChanges,
  pushCurrentBranch,
  stageFiles,
  unstageFiles
} from "./git-actions";
import { cleanupShadowRepos, getFileDiff, getWorkingChanges } from "./agent-changes";
import { getNpmOutdated, getNpmAudit } from "./project-health";
import { choosePackageManager, scanEnvironment } from "./scanner";
import { resolveDevPortInjection } from "./dev-port";
import { isDotnetScript, listDotnetScripts, resolveDotnetLaunch, waitForDotnetPortsFree } from "./dotnet-runner";
import { scanTools, probeSingleTool, listNvmVersions, installNvm, nvmSetDefault, nvmUse, installTool, uninstallTool, checkToolUpdate, updateTool, scanListeningPorts, buildProcessTree, getDescendantPids } from "./environment-scanner";
import { listTemplatePackageEntries } from "./template-package-manifest";
import { WorkflowEngine } from "./workflow-engine";
import { getAgentDefinition, listAgents, resumeArgs } from "./agents/agent-registry";
import { listAgentSessions } from "./agents/agent-sessions";
import { AttentionDetector } from "./agents/attention-detector";
import { Autopilot, type AutopilotAnswered } from "./agents/autopilot";
import type { AutopilotHold } from "./agents/autopilot-policy";
import {
  getAutopilotSettings,
  isAutopilotActive,
  setAutopilotEnabled,
  setAutopilotProject
} from "./agents/autopilot-store";
import { addCustomAgent, removeCustomAgent, type CustomAgentInput } from "./agents/custom-agents-store";
import { getAgentUsage } from "./agents/agent-usage";
import { watchAgentActivity } from "./agents/agent-activity-watcher";
import { setAgentBudget } from "./agents/agent-limits-store";
import { listHighlightingAssets, openHighlightingFolder } from "./highlighting-store";
import { toggleMediaPictureInPicture } from "./media-pip";
import {
  closePictureInPicture,
  getPictureInPictureState,
  onPictureInPictureChanged,
  openPictureInPicture,
  type PictureInPictureSource
} from "./picture-in-picture";
import {
  compileDmg,
  defaultOutputPath,
  inspectAppBundle,
  type AppBundleInfo,
  type DmgResult
} from "./dmg-compiler";
import { guardPreviewWebviews, openExternalUrl } from "./preview-guard";
import { findSymbolDefinition } from "./symbol-finder";
import { killListeningProcess, listListeningProcesses } from "./port-reaper";
import { getLazyShieldState, initLazyShield, setLazyShieldEnabled, shouldBlockPopup } from "./lazy-shield";
import { matchPackageVersions } from "../brain/package-version-matcher";
import { normalizeRuntimePath } from "./runtime-path";

let mainWindow: BrowserWindow | null = null;
let stopAgentActivityWatch: (() => void) | null = null;

const emitToRenderer = (channel: string, payload: unknown) => {
  mainWindow?.webContents.send(channel, payload);
};

const commandRunner = new CommandRunner((event) => emitToRenderer("lazify:log", event));
const workflowEngine = new WorkflowEngine(commandRunner, (event) =>
  emitToRenderer("lazify:workflow-progress", event)
);
const attentionDetector = new AttentionDetector((runId) => emitTurnDone(runId));

/**
 * Reports a run that has started (or stopped) waiting on the user. Two distinct
 * alerts, on two distinct conditions:
 *
 *  - The in-app indicators (the project-card bell, the tab marker) follow the
 *    waiting state itself and are ALWAYS sent, focus or not — while the agent
 *    waits for an answer, its project shows the bell.
 *  - The OS notification and dock bounce are the ONLY thing that reaches the
 *    user when Lazify is not focused, so they fire solely in that case. With
 *    the window focused the bell is already on screen, so a banner would be
 *    redundant noise.
 *
 * `hold` carries the reason autopilot left this one alone, when it looked at it.
 * The alert is the same either way — the user is still needed — but "this is a
 * force-push" and "this is asking which approach you want" are worth telling
 * apart before walking over to the terminal.
 */
const emitAttention = (runId: string, waiting: boolean, hold: AutopilotHold | null = null) => {
  const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
  if (!session) return;

  // In-app: the project-card bell / tab marker. Never gated on focus.
  emitToRenderer("lazify:agent-attention", {
    runId,
    projectPath: session.projectPath,
    projectName: session.projectName,
    agentLabel: session.scriptName,
    waiting,
    hold
  });

  // OS-level: only when the agent is waiting AND the user is looking elsewhere.
  if (!waiting || mainWindow?.isFocused()) return;

  if (Notification.isSupported()) {
    new Notification({
      title: `${session.scriptName} needs you`,
      body: `${session.projectName} is waiting for a response.`
    }).show();
  }

  // Bounces the dock icon until the user comes back to the app.
  app.dock?.bounce("informational");
};

/** Brings the window forward and points the renderer at a specific run. */
const focusRun = (payload: { runId: string; projectPath: string }) => {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.show();
  mainWindow?.focus();

  emitToRenderer("lazify:agent-focus", payload);
};

/**
 * Reports a run that has finished what the user asked of it — the counterpart
 * to the waiting alert above, and the same split: the in-app toast is always
 * sent, while the OS banner only fires when the window is not focused. Its
 * click handler is the point of the banner: it lands the user on the terminal
 * that finished rather than merely raising the app.
 */
const emitTurnDone = (runId: string) => {
  const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
  if (!session) return;

  const payload = {
    runId,
    projectPath: session.projectPath,
    projectName: session.projectName,
    agentLabel: session.scriptName
  };

  emitToRenderer("lazify:agent-done", payload);

  if (mainWindow?.isFocused()) return;

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: `${session.scriptName} is done`,
      body: `${session.projectName} finished the task you gave it.`
    });

    notification.on("click", () => focusRun(payload));
    notification.show();
  }

  app.dock?.bounce("informational");
};

const ptyRunner = new PtyRunner(
  (event) => {
    emitToRenderer("lazify:pty-data", event);

    const waiting = attentionDetector.push(event.runId, event.data);
    if (waiting === null) return;

    // A prompt autopilot has taken on does not ring the bell yet: it is usually
    // answered inside the settle window, and an alert for something the user
    // never had to act on is the noise this feature exists to remove. Declining
    // comes back through `onHeld`, which raises the ordinary alert from there —
    // so every prompt still reaches the user by one path or the other.
    if (waiting && autopilot.willConsider(event.runId)) {
      autopilot.consider(event.runId);
      return;
    }

    emitAttention(event.runId, waiting);
  },
  (event) => {
    emitToRenderer("lazify:script-status", event);

    // The session is already gone from the runner by the time this fires, so
    // there is nothing to look up — the renderer clears its own badge off the
    // same status event.
    if (event.status === "done" || event.status === "error") {
      attentionDetector.forget(event.runId);
      autopilot.forget(event.runId);
    }
  }
);

/**
 * Reports a prompt autopilot answered by itself.
 *
 * Deliberately loud in the feed and silent everywhere else: no notification, no
 * dock bounce. The point of answering was that the user did not have to be
 * interrupted, so telling them about it with a banner would undo the feature.
 * The record is there for when they want to know what was said in their name.
 */
const emitAutopilotAnswer = (runId: string, detail: AutopilotAnswered) => {
  const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
  if (!session) return;

  emitToRenderer("lazify:autopilot-answered", {
    runId,
    projectPath: session.projectPath,
    projectName: session.projectName,
    agentLabel: session.scriptName,
    question: detail.question,
    optionLabel: detail.optionLabel
  });
};

/**
 * Autopilot: the prompts the user would have said yes to anyway, answered for
 * them — and only those. What it will not touch is in `autopilot-policy`.
 */
const autopilot = new Autopilot({
  isActive: (runId) => {
    const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
    if (!session) return false;

    // Only agent runs are tracked, and only they are ever typed into: a dev
    // server asking something is not a prompt this understands.
    return attentionDetector.isTracked(runId) && isAutopilotActive(session.projectPath);
  },
  getScreen: (runId) => attentionDetector.screen(runId),
  isWaiting: (runId) => attentionDetector.isWaiting(runId),
  answer: (runId, keys) => {
    // Clearing without emitting: the waiting state was never announced, so
    // there is no alert to take back — only the detector's own turn bookkeeping
    // to bring in line with the answer that just went in.
    attentionDetector.clear(runId);
    ptyRunner.write(runId, keys);
  },
  onAnswered: emitAutopilotAnswer,
  onHeld: (runId, detail) => emitAttention(runId, true, detail.hold)
});

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
      sandbox: true,
      // Powers the agent preview browser. The guest is locked to loopback by
      // `guardPreviewWebviews` — everything else leaves for the real browser.
      webviewTag: true
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
  ipcMain.handle("lazify:uninstall-tool", async (_event, toolName: string) => uninstallTool(toolName));
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
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
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

  ipcMain.handle("lazify:npm-outdated", async (_event, projectPath: string) =>
    getNpmOutdated(projectPath)
  );

  ipcMain.handle("lazify:npm-audit", async (_event, projectPath: string) =>
    getNpmAudit(projectPath)
  );

  ipcMain.handle("lazify:list-scripts", async (_event, projectPath: string): Promise<Record<string, string>> => {
    // A .NET project has no scripts of its own, so synthesised `dotnet:*` ones
    // are offered alongside whatever package.json provides.
    const dotnetScripts = await listDotnetScripts(projectPath);
    const pkgJsonPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(pkgJsonPath)) return dotnetScripts;
    const raw = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")) as Record<string, unknown>;
    return { ...((raw.scripts ?? {}) as Record<string, string>), ...dotnetScripts };
  });

  const launchScript = async (projectPath: string, scriptName: string, cols: number, rows: number): Promise<{ runId: string; ptyAvailable: boolean }> => {
    const dotnetLaunch = await resolveDotnetLaunch(projectPath, scriptName);
    const packageManager = choosePackageManager(projectPath);
    // If this dev script's port is already taken, step up to the next free one.
    // The dotnet CLI takes neither the flag nor PORT, so it opts out.
    const { extraArgs, env } = dotnetLaunch
      ? { extraArgs: [] as string[], env: {} as Record<string, string> }
      : await resolveDevPortInjection(projectPath, scriptName, packageManager);
    const command = dotnetLaunch?.command ?? packageManager;
    const args = dotnetLaunch
      ? dotnetLaunch.args
      : [...(packageManager === "yarn" ? [scriptName] : ["run", scriptName]), ...extraArgs];

    if (ptyRunner.available) {
      const runId = ptyRunner.start(command, args, projectPath, scriptName, cols as number, rows as number, env);
      return { runId, ptyAvailable: true };
    }

    // Fallback: spawn without PTY (no interactive output)
    const runId = commandRunner.startScript(
      { command, args, cwd: projectPath, env },
      (event) => emitToRenderer("lazify:pty-data", { runId: event.id, data: event.message }),
      (id, exitCode) => emitToRenderer("lazify:script-status", { runId: id, scriptName, exitCode, status: exitCode === 0 ? "done" : "error" })
    );
    emitToRenderer("lazify:script-status", { runId, scriptName, exitCode: null, status: "running" });
    return { runId, ptyAvailable: false };
  };

  ipcMain.handle("lazify:run-script", async (_event, projectPath: string, scriptName: string, cols = 220, rows = 50) =>
    launchScript(projectPath, scriptName, cols as number, rows as number)
  );

  ipcMain.handle("lazify:stop-script", async (_event, runId: string): Promise<void> => {
    if (runId.startsWith("pty-")) {
      ptyRunner.kill(runId);
      // An explicit kill — from the sessions pane, a closed tab, or Stop — should
      // take the agent-pane tab with it, unlike a process that exits on its own
      // (whose tab is kept so its final output can be read).
      emitToRenderer("lazify:session-killed", { runId });
    } else {
      commandRunner.stopScript(runId);
    }
  });

  /**
   * Stop-then-start as one call. Done in main rather than the renderer so the
   * relaunch waits for the old process to actually exit — otherwise a dev
   * server restart races its predecessor for the port.
   */
  ipcMain.handle(
    "lazify:restart-script",
    async (_event, runId: string, projectPath: string, scriptName: string, cols = 220, rows = 50): Promise<{ runId: string; ptyAvailable: boolean }> => {
      if (runId.startsWith("pty-")) {
        await ptyRunner.killAndWait(runId);
      } else {
        commandRunner.stopScript(runId);
      }

      // Kestrel's listener can outlive the process it belonged to; rebinding in
      // that window is exactly what "address already in use" is.
      if (isDotnetScript(scriptName)) {
        await waitForDotnetPortsFree(projectPath);
      }

      return launchScript(projectPath, scriptName, cols as number, rows as number);
    }
  );

  ipcMain.handle("lazify:list-sessions", async () => {
    const sessions = ptyRunner.getSessions();
    if (sessions.length === 0) return [];

    const [ports, tree] = await Promise.all([scanListeningPorts(), buildProcessTree()]);

    return sessions.map((s) => {
      const descendants = getDescendantPids(s.pid, tree);
      const sessionPorts = ports
        .filter((p) => descendants.has(p.pid))
        .map((p) => ({ port: p.port, command: p.command, address: p.address }));
      return {
        ...s,
        ports: sessionPorts,
        waiting: attentionDetector.isWaiting(s.runId),
        // Only agent runs are tracked, so this doubles as "is this an agent".
        isAgent: attentionDetector.isTracked(s.runId)
      };
    });
  });

  // Fire-and-forget — no invoke/handle round-trip needed for input
  ipcMain.on("lazify:pty-write", (_event, runId: string, data: string) => {
    // Submitting (Enter) is what answers a waiting prompt. Navigating a menu
    // with arrow keys leaves it still waiting, so clearing on every keystroke
    // would drop the badge and then re-fire it on the menu's next redraw.
    if (/[\r\n]/.test(data) && attentionDetector.clear(runId)) {
      emitAttention(runId, false);
    }

    ptyRunner.write(runId, data);
  });

  ipcMain.handle("lazify:pty-backlog", async (_event, runId: string) => ptyRunner.getBacklog(runId));

  ipcMain.on("lazify:pty-resize", (_event, runId: string, cols: number, rows: number) => {
    ptyRunner.resize(runId, cols, rows);
  });

  ipcMain.handle("lazify:list-agents", async () => listAgents());

  // Past conversations for this project, so one can be resumed rather than
  // started from nothing.
  ipcMain.handle("lazify:list-agent-sessions", async (_event, projectPath: string) =>
    listAgentSessions(projectPath)
  );

  ipcMain.handle("lazify:add-custom-agent", async (_event, input: CustomAgentInput) =>
    addCustomAgent(input)
  );

  ipcMain.handle(
    "lazify:agent-usage",
    async (_event, sinceIso?: string, agentIds?: string[]) =>
      getAgentUsage(sinceIso, agentIds)
  );

  ipcMain.handle(
    "lazify:set-agent-budget",
    async (_event, agentId: string, weeklyTokens: number) =>
      setAgentBudget(agentId, weeklyTokens)
  );

  ipcMain.handle("lazify:remove-custom-agent", async (_event, agentId: string) =>
    removeCustomAgent(agentId)
  );

  // Autopilot's switches. Read on every prompt rather than cached, so turning it
  // off stops the very next answer instead of the next launch.
  ipcMain.handle("lazify:autopilot-settings", async () => getAutopilotSettings());

  ipcMain.handle("lazify:set-autopilot", async (_event, enabled: boolean) =>
    setAutopilotEnabled(enabled)
  );

  ipcMain.handle(
    "lazify:set-autopilot-project",
    async (_event, projectPath: string, enabled: boolean) =>
      setAutopilotProject(projectPath, enabled)
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

  ipcMain.handle("lazify:highlighting-assets", async () => listHighlightingAssets());

  ipcMain.handle("lazify:open-highlighting-folder", async () => openHighlightingFolder());

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

  // ── DMG compiler ──────────────────────────────────────────────────────────
  // A `.app` in, a `.dmg` out. Both pickers live here because the dialogs need
  // the window to hang off, and the save dialog is also what asks about
  // replacing a file that already exists.

  ipcMain.handle("lazify:select-app-bundle", async (): Promise<string | null> => {
    const options: OpenDialogOptions = {
      title: "Choose a macOS app",
      // No `treatPackageAsDirectory`: the bundle is what is being picked, and
      // letting the picker descend into it only invites choosing a file inside.
      properties: ["openFile"],
      filters: [{ name: "Application", extensions: ["app"] }]
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled) return null;

    return result.filePaths[0] ?? null;
  });

  ipcMain.handle(
    "lazify:select-dmg-destination",
    async (_event, suggestedPath: string): Promise<string | null> => {
      const result = mainWindow
        ? await dialog.showSaveDialog(mainWindow, {
            title: "Where should the disk image go?",
            defaultPath: suggestedPath,
            filters: [{ name: "Disk Image", extensions: ["dmg"] }]
          })
        : await dialog.showSaveDialog({
            title: "Where should the disk image go?",
            defaultPath: suggestedPath,
            filters: [{ name: "Disk Image", extensions: ["dmg"] }]
          });

      if (result.canceled || !result.filePath) return null;

      return result.filePath;
    }
  );

  ipcMain.handle(
    "lazify:inspect-app-bundle",
    async (_event, appPath: string): Promise<AppBundleInfo> => inspectAppBundle(appPath)
  );

  ipcMain.handle(
    "lazify:default-dmg-path",
    async (_event, appPath: string, suggestedFileName: string): Promise<string> =>
      defaultOutputPath(appPath, suggestedFileName)
  );

  ipcMain.handle(
    "lazify:compile-dmg",
    async (
      _event,
      appPath: string,
      outputPath: string,
      volumeName?: string | null
    ): Promise<DmgResult> =>
      compileDmg({ appPath, outputPath, volumeName }, (progress) =>
        emitToRenderer("lazify:dmg-progress", progress)
      )
  );

  // The PTY pids let the reaper tell a script Lazify started apart from
  // Lazify's own processes, which it must never offer to kill.
  const managedRootPids = () => ptyRunner.getSessions().map((session) => session.pid);

  ipcMain.handle("lazify:listening-processes", async () =>
    listListeningProcesses(managedRootPids())
  );

  ipcMain.handle("lazify:kill-listening-process", async (_event, pid: number) =>
    killListeningProcess(pid, managedRootPids())
  );

  ipcMain.handle("lazify:lazy-shield-state", async () => getLazyShieldState());

  ipcMain.handle("lazify:set-lazy-shield", async (_event, next: boolean) =>
    setLazyShieldEnabled(next)
  );

  // "Open in browser" from the preview toolbar — the one way a URL is meant to
  // leave the app, so it takes the same http(s)-only path as a diverted link.
  ipcMain.handle("lazify:open-external-url", async (_event, url: string) => openExternalUrl(url));

  // Picture in picture: the page in a floating always-on-top window. The
  // surface that asked decides the session it joins and how far it may go.
  ipcMain.handle(
    "lazify:open-picture-in-picture",
    async (_event, url: string, source: PictureInPictureSource) =>
      openPictureInPicture(url, source)
  );

  ipcMain.handle("lazify:close-picture-in-picture", async () => closePictureInPicture());

  ipcMain.handle("lazify:picture-in-picture-state", async () => getPictureInPictureState());

  // The other kind: the page's own video in the OS mini player. Driven from
  // here because the video is often inside a frame the renderer cannot reach.
  ipcMain.handle("lazify:toggle-media-picture-in-picture", async (_event, webContentsId: number) =>
    toggleMediaPictureInPicture(webContentsId)
  );

  // Go-to-definition for the read-only editors: a name in, a file and line out.
  ipcMain.handle(
    "lazify:find-symbol-definition",
    async (_event, projectPath: string, symbol: string) =>
      findSymbolDefinition(projectPath, symbol)
  );

  // Agents are plain interactive CLIs: run them in a PTY and let xterm render.
  // Input, resize, and teardown reuse the existing pty-write/resize/stop-script channels.
  ipcMain.handle(
    "lazify:open-agent-terminal",
    async (
      _event,
      agentId: string,
      projectPath: string,
      cols = 120,
      rows = 30,
      resumeSessionId?: string
    ): Promise<{ runId: string }> => {
      const definition = getAgentDefinition(agentId);

      if (!definition) {
        throw new Error(`Unknown agent: ${agentId}`);
      }

      if (!ptyRunner.available) {
        throw new Error("node-pty is not available. Run: npm run rebuild");
      }

      // Resuming is the same launch with the CLI's own flag appended; an agent
      // that has no such flag simply starts fresh.
      const resume = resumeSessionId ? resumeArgs(agentId, resumeSessionId) : null;

      const runId = ptyRunner.start(
        definition.binary,
        resume ? [...definition.args, ...resume] : definition.args,
        projectPath,
        definition.label,
        cols as number,
        rows as number
      );

      // Only agent sessions are watched for prompts — a dev server's output is
      // not a permission request, however much it looks like one.
      attentionDetector.track(runId);

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
  // Sweeps up anything a previous run was killed before it could delete.
  cleanupShadowRepos();
  // Must be in place before any window — and so any `<webview>` — exists.
  // A popped-out link from the browser page comes back as a new tab.
  guardPreviewWebviews(
    (url, background) => emitToRenderer("lazify:browser-open-tab", { url, background }),
    // A popup is decided before any request exists, so the shield has to be
    // consulted here or an ad popup becomes a tab the filter can no longer stop.
    shouldBlockPopup
  );

  // Restores the saved shield preference before the browser page loads anything.
  void initLazyShield((blocked) => emitToRenderer("lazify:lazy-shield-blocked", { blocked }));

  // There is one floating window and a button for it on more than one surface,
  // so every change — opened, re-pointed, closed from its own title bar — has to
  // reach all of them, or a toggle is left claiming something untrue.
  onPictureInPictureChanged((state) =>
    emitToRenderer("lazify:picture-in-picture-changed", state)
  );

  if (process.platform === "darwin") {
    app.dock?.setIcon(path.join(app.getAppPath(), "build/icon.png"));
  }

  registerIpcHandlers();
  mainWindow = createMainWindow();

  // A floater outliving the window that opened it would keep the app running
  // with nothing to drive it — and on macOS it would also stop the dock icon
  // from bringing the real window back.
  mainWindow.on("closed", () => closePictureInPicture());

  // The usage panel listens for this instead of polling on a timer.
  stopAgentActivityWatch = watchAgentActivity((event) =>
    emitToRenderer("lazify:agent-activity", event)
  );

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

// The shadow repos are session scratch space, so they leave with the session.
app.on("will-quit", () => {
  cleanupShadowRepos();
  stopAgentActivityWatch?.();
  stopAgentActivityWatch = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
