import { contextBridge, ipcRenderer, webUtils } from "electron";

import type { AgentActivityEvent } from "../main/agents/agent-activity-watcher";
import type { CommandChoicePrompt, LogEvent } from "../main/command-runner";
import type { TemplateDefinition } from "../main/scaffolding/harmonizer";
import type { NpmPackageSearchResult } from "../main/scaffolding/npm-registry";
import type {
  AgentFileChange,
  AgentUsageReport,
  EnvFileSummary,
  EnvVariablePatch,
  ProjectEnvFile,
  InstalledPackage,
  NpmAuditResult,
  NpmOutdatedResult,
  PtySession,
  ScriptStatusEvent,
  ProjectGitStatusResult,
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ImportedProjectIndexResult,
  ImportedProjectScanResult,
  ProjectAssetFile,
  ProjectTreeNode,
  UpdateState
} from "../renderer/shared/types/lazify";
import type { EnvironmentScan } from "../main/environment/scanner";
import type { ToolScanReport, NvmVersionList, NvmInstallResult, NvmActionResult, ToolUpdateInfo } from "../main/environment/environment-scanner";
import type { TemplatePackageEntry } from "../main/scaffolding/template-package-manifest";
import type { AgentDescriptor } from "../main/agents/agent-registry";
import type { AutopilotHold } from "../main/agents/autopilot-policy";
import type { AppBundleInfo, DmgProgress, DmgResult } from "../main/dmg-compiler";
import type { AutopilotSettings } from "../main/agents/autopilot-store";
import type { AgentSessionSummary } from "../main/agents/agent-sessions";
import type { CustomAgent, CustomAgentInput } from "../main/agents/custom-agents-store";
import type { HighlightingAssets } from "../main/code-intelligence/highlighting-store";
import type { GitCheckoutResult } from "../main/projects/project-git-status";
import type { GitActionResult } from "../main/projects/git-actions";
import type { DiagnosticsPaths } from "../main/diagnostics/logger";
import type { VersionMatchReport } from "../brain/package-version-matcher";
import type {
  AddProjectPackagePayload,
  CreateProjectPayload,
  InstallPackagePayload,
  RemoveProjectPackagePayload,
  WorkflowProgressEvent,
  WorkflowResult
} from "../main/scaffolding/workflow-engine";

const lazifyApi = {
  /**
   * What the app is running on, so the renderer can hide features that only
   * exist on one OS — building a disk image, for one.
   */
  platform: process.platform,
  runCommand: (command: string, args: string[], cwd?: string) =>
    ipcRenderer.invoke("lazify:run-command", command, args, cwd),
  createProject: (payload: CreateProjectPayload): Promise<WorkflowResult> =>
    ipcRenderer.invoke("lazify:create-project", payload),
  chooseCommandOption: (promptId: string, optionId: string): Promise<boolean> =>
    ipcRenderer.invoke("lazify:choose-command-option", promptId, optionId),
  installPackage: (payload: InstallPackagePayload): Promise<WorkflowResult> =>
    ipcRenderer.invoke("lazify:install-package", payload),
  checkEnvironment: (): Promise<EnvironmentScan> => ipcRenderer.invoke("lazify:environment"),
  scanTools: (force = false): Promise<ToolScanReport> => ipcRenderer.invoke("lazify:scan-tools", force),
  probeTool: (name: string): Promise<import("../main/environment/environment-scanner").DetectedTool | null> => ipcRenderer.invoke("lazify:probe-tool", name),
  nvmListVersions: (): Promise<NvmVersionList> => ipcRenderer.invoke("lazify:nvm-list-versions"),
  installNvm: (): Promise<NvmInstallResult> => ipcRenderer.invoke("lazify:install-nvm"),
  nvmSetDefault: (version: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:nvm-set-default", version),
  nvmUse: (version: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:nvm-use", version),
  installTool: (toolName: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:install-tool", toolName),
  uninstallTool: (toolName: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:uninstall-tool", toolName),
  checkToolUpdate: (toolName: string, currentVersion: string): Promise<ToolUpdateInfo> => ipcRenderer.invoke("lazify:check-tool-update", toolName, currentVersion),
  updateTool: (toolName: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:update-tool", toolName),
  relaunchApp: (): Promise<void> => ipcRenderer.invoke("lazify:relaunch"),

  // Tells the main process React has painted, which is what dismisses the splash
  // and shows the window.
  signalRendererReady: (): void => ipcRenderer.send("lazify:renderer-ready"),
  listTemplates: (): Promise<TemplateDefinition[]> => ipcRenderer.invoke("lazify:templates"),
  listImportedTemplates: (): Promise<ImportedTemplateOption[]> =>
    ipcRenderer.invoke("lazify:imported-templates"),
  getImportedTemplate: (templateId: string): Promise<ImportedTemplateSnapshot> =>
    ipcRenderer.invoke("lazify:imported-template", templateId),
  updateImportedTemplate: (
    templateId: string,
    updates: { name?: string | null; tree?: ProjectTreeNode[] | null }
  ): Promise<ImportedTemplateSnapshot> =>
    ipcRenderer.invoke("lazify:update-imported-template", templateId, updates),
  deleteImportedTemplate: (templateId: string): Promise<void> =>
    ipcRenderer.invoke("lazify:delete-imported-template", templateId),
  getTemplatePackageManifest: (templateId: string): Promise<TemplatePackageEntry[]> =>
    ipcRenderer.invoke("lazify:template-package-manifest", templateId),
  searchNpmPackages: (query: string): Promise<NpmPackageSearchResult[]> =>
    ipcRenderer.invoke("lazify:search-npm-packages", query),
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke("lazify:select-directory"),
  selectPaths: (defaultPath?: string | null): Promise<string[]> =>
    ipcRenderer.invoke("lazify:select-paths", defaultPath),
  importProjectFromDirectory: (projectPath: string): Promise<ImportedProjectScanResult> =>
    ipcRenderer.invoke("lazify:import-project-from-directory", projectPath),
  importProjectIndexFromDirectory: (projectPath: string): Promise<ImportedProjectIndexResult> =>
    ipcRenderer.invoke("lazify:import-project-index-from-directory", projectPath),
  readImportedProjectFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("lazify:read-imported-project-file", filePath),
  readProjectAssetFile: (filePath: string): Promise<ProjectAssetFile> =>
    ipcRenderer.invoke("lazify:read-project-asset-file", filePath),
  getDiagnosticsPaths: (): Promise<DiagnosticsPaths> =>
    ipcRenderer.invoke("lazify:diagnostics-paths"),
  getUpdateState: (): Promise<UpdateState> => ipcRenderer.invoke("lazify:update-state"),
  checkForUpdates: (): Promise<UpdateState> => ipcRenderer.invoke("lazify:check-for-updates"),
  downloadUpdate: (): Promise<UpdateState> => ipcRenderer.invoke("lazify:download-update"),
  quitAndInstallUpdate: (): Promise<void> =>
    ipcRenderer.invoke("lazify:quit-and-install-update"),
  onUpdateStateChanged: (callback: (state: UpdateState) => void) => {
    const listener = (_event: unknown, payload: UpdateState) => callback(payload);
    ipcRenderer.on("lazify:update-state-changed", listener);
    return () => ipcRenderer.removeListener("lazify:update-state-changed", listener);
  },
  getProjectGitStatus: (projectPath: string): Promise<ProjectGitStatusResult> =>
    ipcRenderer.invoke("lazify:project-git-status", projectPath),
  getWorkingChanges: (projectPath: string): Promise<AgentFileChange[]> =>
    ipcRenderer.invoke("lazify:working-changes", projectPath),
  getFileDiff: (projectPath: string, filePath: string, fullFile?: boolean): Promise<string> =>
    ipcRenderer.invoke("lazify:file-diff", projectPath, filePath, fullFile),
  getNpmOutdated: (projectPath: string): Promise<NpmOutdatedResult> =>
    ipcRenderer.invoke("lazify:npm-outdated", projectPath),
  getNpmAudit: (projectPath: string): Promise<NpmAuditResult> =>
    ipcRenderer.invoke("lazify:npm-audit", projectPath),
  listEnvFiles: (projectPath: string): Promise<EnvFileSummary[]> =>
    ipcRenderer.invoke("lazify:list-env-files", projectPath),
  readEnvFile: (projectPath: string, fileName: string): Promise<ProjectEnvFile> =>
    ipcRenderer.invoke("lazify:read-env-file", projectPath, fileName),
  updateEnvVariable: (
    projectPath: string,
    fileName: string,
    line: number,
    expectedKey: string,
    patch: EnvVariablePatch
  ): Promise<ProjectEnvFile> =>
    ipcRenderer.invoke("lazify:update-env-variable", projectPath, fileName, line, expectedKey, patch),
  deleteEnvVariable: (
    projectPath: string,
    fileName: string,
    line: number,
    expectedKey: string
  ): Promise<ProjectEnvFile> =>
    ipcRenderer.invoke("lazify:delete-env-variable", projectPath, fileName, line, expectedKey),
  addEnvVariable: (projectPath: string, fileName: string, key: string, value: string): Promise<ProjectEnvFile> =>
    ipcRenderer.invoke("lazify:add-env-variable", projectPath, fileName, key, value),
  createEnvFile: (projectPath: string, fileName: string): Promise<ProjectEnvFile> =>
    ipcRenderer.invoke("lazify:create-env-file", projectPath, fileName),
  listScripts: (projectPath: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke("lazify:list-scripts", projectPath),
  runScript: (projectPath: string, scriptName: string, cols?: number, rows?: number): Promise<{ runId: string; ptyAvailable: boolean }> =>
    ipcRenderer.invoke("lazify:run-script", projectPath, scriptName, cols, rows),
  stopScript: (runId: string): Promise<void> =>
    ipcRenderer.invoke("lazify:stop-script", runId),
  restartScript: (runId: string, projectPath: string, scriptName: string, cols?: number, rows?: number): Promise<{ runId: string; ptyAvailable: boolean }> =>
    ipcRenderer.invoke("lazify:restart-script", runId, projectPath, scriptName, cols, rows),
  listSessions: (): Promise<PtySession[]> =>
    ipcRenderer.invoke("lazify:list-sessions"),
  ptyWrite: (runId: string, data: string): void =>
    ipcRenderer.send("lazify:pty-write", runId, data),
  ptyBacklog: (runId: string): Promise<import("../main/pty-runner").PtyBacklog> =>
    ipcRenderer.invoke("lazify:pty-backlog", runId),
  ptyResize: (runId: string, cols: number, rows: number): void =>
    ipcRenderer.send("lazify:pty-resize", runId, cols, rows),
  /** Saves whatever image is on the clipboard to a temp PNG; null if it's not an image. */
  saveClipboardImage: (): Promise<string | null> =>
    ipcRenderer.invoke("lazify:save-clipboard-image"),
  onAgentAttention: (
    callback: (event: {
      runId: string;
      projectPath: string;
      projectName: string;
      agentLabel: string;
      waiting: boolean;
      /** Why autopilot left this prompt to the user, when it looked at it. */
      hold: AutopilotHold | null;
    }) => void
  ) => {
    const listener = (_event: unknown, payload: Parameters<typeof callback>[0]) => callback(payload);
    ipcRenderer.on("lazify:agent-attention", listener);
    return () => ipcRenderer.removeListener("lazify:agent-attention", listener);
  },
  onAutopilotAnswered: (
    callback: (event: {
      runId: string;
      projectPath: string;
      projectName: string;
      agentLabel: string;
      question: string;
      optionLabel: string;
    }) => void
  ) => {
    const listener = (_event: unknown, payload: Parameters<typeof callback>[0]) => callback(payload);
    ipcRenderer.on("lazify:autopilot-answered", listener);
    return () => ipcRenderer.removeListener("lazify:autopilot-answered", listener);
  },
  onAgentDone: (
    callback: (event: {
      runId: string;
      projectPath: string;
      projectName: string;
      agentLabel: string;
    }) => void
  ) => {
    const listener = (_event: unknown, payload: Parameters<typeof callback>[0]) => callback(payload);
    ipcRenderer.on("lazify:agent-done", listener);
    return () => ipcRenderer.removeListener("lazify:agent-done", listener);
  },
  onAgentFocus: (
    callback: (event: { runId: string; projectPath: string }) => void
  ) => {
    const listener = (_event: unknown, payload: Parameters<typeof callback>[0]) => callback(payload);
    ipcRenderer.on("lazify:agent-focus", listener);
    return () => ipcRenderer.removeListener("lazify:agent-focus", listener);
  },
  onPtyData: (callback: (event: { runId: string; data: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { runId: string; data: string }) => callback(payload);
    ipcRenderer.on("lazify:pty-data", listener);
    return () => ipcRenderer.removeListener("lazify:pty-data", listener);
  },
  onScriptStatus: (callback: (event: ScriptStatusEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: ScriptStatusEvent) => callback(payload);
    ipcRenderer.on("lazify:script-status", listener);
    return () => ipcRenderer.removeListener("lazify:script-status", listener);
  },
  onSessionKilled: (callback: (event: { runId: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { runId: string }) => callback(payload);
    ipcRenderer.on("lazify:session-killed", listener);
    return () => ipcRenderer.removeListener("lazify:session-killed", listener);
  },
  listAgents: (): Promise<AgentDescriptor[]> => ipcRenderer.invoke("lazify:list-agents"),
  listAgentSessions: (projectPath: string): Promise<AgentSessionSummary[]> =>
    ipcRenderer.invoke("lazify:list-agent-sessions", projectPath),
  addCustomAgent: (input: CustomAgentInput): Promise<CustomAgent> =>
    ipcRenderer.invoke("lazify:add-custom-agent", input),
  removeCustomAgent: (agentId: string): Promise<void> =>
    ipcRenderer.invoke("lazify:remove-custom-agent", agentId),
  autopilotSettings: (): Promise<AutopilotSettings> =>
    ipcRenderer.invoke("lazify:autopilot-settings"),
  setAutopilot: (enabled: boolean): Promise<AutopilotSettings> =>
    ipcRenderer.invoke("lazify:set-autopilot", enabled),
  setAutopilotProject: (projectPath: string, enabled: boolean): Promise<AutopilotSettings> =>
    ipcRenderer.invoke("lazify:set-autopilot-project", projectPath, enabled),
  checkoutBranch: (projectPath: string, branch: string): Promise<GitCheckoutResult> =>
    ipcRenderer.invoke("lazify:checkout-branch", projectPath, branch),
  stageFiles: (projectPath: string, paths: string[]): Promise<GitActionResult> =>
    ipcRenderer.invoke("lazify:stage-files", projectPath, paths),
  unstageFiles: (projectPath: string, paths: string[]): Promise<GitActionResult> =>
    ipcRenderer.invoke("lazify:unstage-files", projectPath, paths),
  discardChanges: (projectPath: string, paths: string[]): Promise<GitActionResult> =>
    ipcRenderer.invoke("lazify:discard-changes", projectPath, paths),
  commitChanges: (projectPath: string, message: string): Promise<GitActionResult> =>
    ipcRenderer.invoke("lazify:commit-changes", projectPath, message),
  pushBranch: (projectPath: string): Promise<GitActionResult> =>
    ipcRenderer.invoke("lazify:push-branch", projectPath),
  /**
   * Where a dropped file actually lives on disk.
   *
   * `File.path` used to carry this and was removed from Electron; this is its
   * replacement, and it only works from here — the renderer has no way to ask.
   */
  pathForDroppedFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      // Something that came from somewhere other than the filesystem — a drag
      // out of a web page, say. It has no path, and the caller offers a picker.
      return "";
    }
  },
  // DMG compiler: pick an app, pick where the image goes, build it.
  selectAppBundle: (): Promise<string | null> => ipcRenderer.invoke("lazify:select-app-bundle"),
  selectDmgDestination: (suggestedPath: string): Promise<string | null> =>
    ipcRenderer.invoke("lazify:select-dmg-destination", suggestedPath),
  inspectAppBundle: (appPath: string): Promise<AppBundleInfo> =>
    ipcRenderer.invoke("lazify:inspect-app-bundle", appPath),
  defaultDmgPath: (appPath: string, suggestedFileName: string): Promise<string> =>
    ipcRenderer.invoke("lazify:default-dmg-path", appPath, suggestedFileName),
  selectDmgImage: (kind: "background" | "icon"): Promise<string | null> =>
    ipcRenderer.invoke("lazify:select-dmg-image", kind),
  dmgImagePreview: (imagePath: string, maxPixels?: number): Promise<string | null> =>
    ipcRenderer.invoke("lazify:dmg-image-preview", imagePath, maxPixels),
  compileDmg: (
    appPath: string,
    outputPath: string,
    volumeName?: string | null,
    backgroundImagePath?: string | null,
    volumeIconPath?: string | null
  ): Promise<DmgResult> =>
    ipcRenderer.invoke(
      "lazify:compile-dmg",
      appPath,
      outputPath,
      volumeName,
      backgroundImagePath,
      volumeIconPath
    ),
  onDmgProgress: (callback: (progress: DmgProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: DmgProgress) => callback(payload);
    ipcRenderer.on("lazify:dmg-progress", listener);
    return () => ipcRenderer.removeListener("lazify:dmg-progress", listener);
  },
  listHighlightingAssets: (): Promise<HighlightingAssets> =>
    ipcRenderer.invoke("lazify:highlighting-assets"),
  openHighlightingFolder: (): Promise<void> =>
    ipcRenderer.invoke("lazify:open-highlighting-folder"),
  revealInFileManager: (targetPath: string): Promise<void> =>
    ipcRenderer.invoke("lazify:reveal-in-file-manager", targetPath),
  openTerminal: (targetPath: string): Promise<void> =>
    ipcRenderer.invoke("lazify:open-terminal", targetPath),
  openExternalUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke("lazify:open-external-url", url),
  listListeningProcesses: (): Promise<import("../main/environment/port-reaper").ListeningProcess[]> =>
    ipcRenderer.invoke("lazify:listening-processes"),
  killListeningProcess: (pid: number): Promise<import("../main/environment/port-reaper").KillResult> =>
    ipcRenderer.invoke("lazify:kill-listening-process", pid),
  getLazyShieldState: (): Promise<import("../main/browser/lazy-shield").LazyShieldState> =>
    ipcRenderer.invoke("lazify:lazy-shield-state"),
  setLazyShield: (enabled: boolean): Promise<import("../main/browser/lazy-shield").LazyShieldState> =>
    ipcRenderer.invoke("lazify:set-lazy-shield", enabled),
  onLazyShieldBlocked: (callback: (event: { blocked: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { blocked: number }) => callback(payload);
    ipcRenderer.on("lazify:lazy-shield-blocked", listener);
    return () => ipcRenderer.removeListener("lazify:lazy-shield-blocked", listener);
  },
  openPictureInPicture: (
    url: string,
    source: import("../main/media/picture-in-picture").PictureInPictureSource
  ): Promise<import("../main/media/picture-in-picture").PictureInPictureState> =>
    ipcRenderer.invoke("lazify:open-picture-in-picture", url, source),
  closePictureInPicture: (): Promise<
    import("../main/media/picture-in-picture").PictureInPictureState
  > => ipcRenderer.invoke("lazify:close-picture-in-picture"),
  getPictureInPictureState: (): Promise<
    import("../main/media/picture-in-picture").PictureInPictureState
  > => ipcRenderer.invoke("lazify:picture-in-picture-state"),
  onPictureInPictureChanged: (
    callback: (state: import("../main/media/picture-in-picture").PictureInPictureState) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: import("../main/media/picture-in-picture").PictureInPictureState
    ) => callback(payload);
    ipcRenderer.on("lazify:picture-in-picture-changed", listener);
    return () => ipcRenderer.removeListener("lazify:picture-in-picture-changed", listener);
  },
  toggleMediaPictureInPicture: (
    webContentsId: number
  ): Promise<import("../main/media/media-pip").MediaPipResult> =>
    ipcRenderer.invoke("lazify:toggle-media-picture-in-picture", webContentsId),
  findSymbolDefinition: (
    projectPath: string,
    symbol: string,
    fromPath?: string | null,
    position?: { line: number; column: number } | null
  ): Promise<import("../main/code-intelligence/symbol-finder").SymbolDefinition | null> =>
    ipcRenderer.invoke(
      "lazify:find-symbol-definition",
      projectPath,
      symbol,
      fromPath,
      position
    ),
  onBrowserOpenTab: (callback: (event: { url: string; background: boolean }) => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: { url: string; background: boolean }
    ) => callback(payload);
    ipcRenderer.on("lazify:browser-open-tab", listener);
    return () => ipcRenderer.removeListener("lazify:browser-open-tab", listener);
  },
  onBrowserPopupBlocked: (
    callback: (event: import("../main/browser/popup-policy").BlockedPopup) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: import("../main/browser/popup-policy").BlockedPopup
    ) => callback(payload);
    ipcRenderer.on("lazify:browser-popup-blocked", listener);
    return () => ipcRenderer.removeListener("lazify:browser-popup-blocked", listener);
  },
  allowPopupsFrom: (sourceUrl: string): Promise<void> =>
    ipcRenderer.invoke("lazify:allow-popups-from", sourceUrl),
  getAgentUsage: (sinceIso?: string, agentIds?: string[]): Promise<AgentUsageReport> =>
    ipcRenderer.invoke("lazify:agent-usage", sinceIso, agentIds),
  setAgentBudget: (agentId: string, weeklyTokens: number): Promise<Record<string, number>> =>
    ipcRenderer.invoke("lazify:set-agent-budget", agentId, weeklyTokens),
  openAgentTerminal: (
    agentId: string,
    projectPath: string,
    cols?: number,
    rows?: number,
    /** Past session to carry on with, instead of starting a new conversation. */
    resumeSessionId?: string
  ): Promise<{ runId: string }> =>
    ipcRenderer.invoke(
      "lazify:open-agent-terminal",
      agentId,
      projectPath,
      cols,
      rows,
      resumeSessionId
    ),
  listProjectPackages: (projectPath: string): Promise<InstalledPackage[]> =>
    ipcRenderer.invoke("lazify:list-project-packages", projectPath),
  addProjectPackage: (payload: AddProjectPackagePayload): Promise<WorkflowResult> =>
    ipcRenderer.invoke("lazify:add-project-package", payload),
  removeProjectPackage: (payload: RemoveProjectPackagePayload): Promise<WorkflowResult> =>
    ipcRenderer.invoke("lazify:remove-project-package", payload),
  installProjectDependencies: (projectPath: string): Promise<WorkflowResult> =>
    ipcRenderer.invoke("lazify:install-project-dependencies", projectPath),
  matchPackageVersions: (projectPath: string): Promise<VersionMatchReport> =>
    ipcRenderer.invoke("lazify:match-package-versions", projectPath),
  fixProjectPackageVersions: (projectPath: string): Promise<import("../main/scaffolding/workflow-engine").WorkflowResult> =>
    ipcRenderer.invoke("lazify:fix-project-package-versions", projectPath),
  saveImportedTemplate: (
    projectPath: string,
    includedRelativePaths: string[],
    providedName?: string | null,
    confirmedStack?: string | null
  ): Promise<ImportedTemplateSnapshot> =>
    ipcRenderer.invoke(
      "lazify:save-imported-template",
      projectPath,
      includedRelativePaths,
      providedName,
      confirmedStack
    ),
  onLog: (callback: (event: LogEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: LogEvent) => callback(payload);
    ipcRenderer.on("lazify:log", listener);
    return () => ipcRenderer.removeListener("lazify:log", listener);
  },
  onCommandChoicePrompt: (callback: (prompt: CommandChoicePrompt) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: CommandChoicePrompt) => callback(payload);
    ipcRenderer.on("lazify:command-choice-prompt", listener);
    return () => ipcRenderer.removeListener("lazify:command-choice-prompt", listener);
  },
  onAgentActivity: (callback: (event: AgentActivityEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AgentActivityEvent) => callback(payload);
    ipcRenderer.on("lazify:agent-activity", listener);
    return () => ipcRenderer.removeListener("lazify:agent-activity", listener);
  },
  onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: WorkflowProgressEvent) => callback(payload);
    ipcRenderer.on("lazify:workflow-progress", listener);
    return () => ipcRenderer.removeListener("lazify:workflow-progress", listener);
  }
};

contextBridge.exposeInMainWorld("lazify", lazifyApi);
