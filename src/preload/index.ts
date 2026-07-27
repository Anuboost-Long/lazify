import { contextBridge, ipcRenderer } from "electron";

import type { AgentActivityEvent } from "../main/agents/agent-activity-watcher";
import type { LogEvent } from "../main/command-runner";
import type { TemplateDefinition } from "../main/harmonizer";
import type { NpmPackageSearchResult } from "../main/npm-registry";
import type {
  AgentFileChange,
  AgentUsageReport,
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
  ProjectTreeNode
} from "../renderer/shared/types/lazify";
import type { EnvironmentScan } from "../main/scanner";
import type { ToolScanReport, NvmVersionList, NvmInstallResult, NvmActionResult, ToolUpdateInfo } from "../main/environment-scanner";
import type { TemplatePackageEntry } from "../main/template-package-manifest";
import type { AgentDescriptor } from "../main/agents/agent-registry";
import type { CustomAgent, CustomAgentInput } from "../main/agents/custom-agents-store";
import type { HighlightingAssets } from "../main/highlighting-store";
import type { GitCheckoutResult } from "../main/project-git-status";
import type { GitActionResult } from "../main/git-actions";
import type { VersionMatchReport } from "../brain/package-version-matcher";
import type {
  AddProjectPackagePayload,
  CreateProjectPayload,
  InstallPackagePayload,
  RemoveProjectPackagePayload,
  WorkflowProgressEvent,
  WorkflowResult
} from "../main/workflow-engine";

const lazifyApi = {
  runCommand: (command: string, args: string[], cwd?: string) =>
    ipcRenderer.invoke("lazify:run-command", command, args, cwd),
  createProject: (payload: CreateProjectPayload): Promise<WorkflowResult> =>
    ipcRenderer.invoke("lazify:create-project", payload),
  installPackage: (payload: InstallPackagePayload): Promise<WorkflowResult> =>
    ipcRenderer.invoke("lazify:install-package", payload),
  checkEnvironment: (): Promise<EnvironmentScan> => ipcRenderer.invoke("lazify:environment"),
  scanTools: (force = false): Promise<ToolScanReport> => ipcRenderer.invoke("lazify:scan-tools", force),
  probeTool: (name: string): Promise<import("../main/environment-scanner").DetectedTool | null> => ipcRenderer.invoke("lazify:probe-tool", name),
  nvmListVersions: (): Promise<NvmVersionList> => ipcRenderer.invoke("lazify:nvm-list-versions"),
  installNvm: (): Promise<NvmInstallResult> => ipcRenderer.invoke("lazify:install-nvm"),
  nvmSetDefault: (version: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:nvm-set-default", version),
  nvmUse: (version: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:nvm-use", version),
  installTool: (toolName: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:install-tool", toolName),
  checkToolUpdate: (toolName: string, currentVersion: string): Promise<ToolUpdateInfo> => ipcRenderer.invoke("lazify:check-tool-update", toolName, currentVersion),
  updateTool: (toolName: string): Promise<NvmActionResult> => ipcRenderer.invoke("lazify:update-tool", toolName),
  relaunchApp: (): Promise<void> => ipcRenderer.invoke("lazify:relaunch"),
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
  importProjectFromDirectory: (projectPath: string): Promise<ImportedProjectScanResult> =>
    ipcRenderer.invoke("lazify:import-project-from-directory", projectPath),
  importProjectIndexFromDirectory: (projectPath: string): Promise<ImportedProjectIndexResult> =>
    ipcRenderer.invoke("lazify:import-project-index-from-directory", projectPath),
  readImportedProjectFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke("lazify:read-imported-project-file", filePath),
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
  onAgentAttention: (
    callback: (event: {
      runId: string;
      projectPath: string;
      projectName: string;
      agentLabel: string;
      waiting: boolean;
    }) => void
  ) => {
    const listener = (_event: unknown, payload: Parameters<typeof callback>[0]) => callback(payload);
    ipcRenderer.on("lazify:agent-attention", listener);
    return () => ipcRenderer.removeListener("lazify:agent-attention", listener);
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
  addCustomAgent: (input: CustomAgentInput): Promise<CustomAgent> =>
    ipcRenderer.invoke("lazify:add-custom-agent", input),
  removeCustomAgent: (agentId: string): Promise<void> =>
    ipcRenderer.invoke("lazify:remove-custom-agent", agentId),
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
  listHighlightingAssets: (): Promise<HighlightingAssets> =>
    ipcRenderer.invoke("lazify:highlighting-assets"),
  openHighlightingFolder: (): Promise<void> =>
    ipcRenderer.invoke("lazify:open-highlighting-folder"),
  openExternalUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke("lazify:open-external-url", url),
  listListeningProcesses: (): Promise<import("../main/port-reaper").ListeningProcess[]> =>
    ipcRenderer.invoke("lazify:listening-processes"),
  killListeningProcess: (pid: number): Promise<import("../main/port-reaper").KillResult> =>
    ipcRenderer.invoke("lazify:kill-listening-process", pid),
  getLazyShieldState: (): Promise<import("../main/lazy-shield").LazyShieldState> =>
    ipcRenderer.invoke("lazify:lazy-shield-state"),
  setLazyShield: (enabled: boolean): Promise<import("../main/lazy-shield").LazyShieldState> =>
    ipcRenderer.invoke("lazify:set-lazy-shield", enabled),
  onLazyShieldBlocked: (callback: (event: { blocked: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { blocked: number }) => callback(payload);
    ipcRenderer.on("lazify:lazy-shield-blocked", listener);
    return () => ipcRenderer.removeListener("lazify:lazy-shield-blocked", listener);
  },
  openPictureInPicture: (
    url: string,
    source: import("../main/picture-in-picture").PictureInPictureSource
  ): Promise<import("../main/picture-in-picture").PictureInPictureState> =>
    ipcRenderer.invoke("lazify:open-picture-in-picture", url, source),
  closePictureInPicture: (): Promise<
    import("../main/picture-in-picture").PictureInPictureState
  > => ipcRenderer.invoke("lazify:close-picture-in-picture"),
  getPictureInPictureState: (): Promise<
    import("../main/picture-in-picture").PictureInPictureState
  > => ipcRenderer.invoke("lazify:picture-in-picture-state"),
  onPictureInPictureChanged: (
    callback: (state: import("../main/picture-in-picture").PictureInPictureState) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      payload: import("../main/picture-in-picture").PictureInPictureState
    ) => callback(payload);
    ipcRenderer.on("lazify:picture-in-picture-changed", listener);
    return () => ipcRenderer.removeListener("lazify:picture-in-picture-changed", listener);
  },
  toggleMediaPictureInPicture: (
    webContentsId: number
  ): Promise<import("../main/media-pip").MediaPipResult> =>
    ipcRenderer.invoke("lazify:toggle-media-picture-in-picture", webContentsId),
  findSymbolDefinition: (
    projectPath: string,
    symbol: string
  ): Promise<import("../main/symbol-finder").SymbolDefinition | null> =>
    ipcRenderer.invoke("lazify:find-symbol-definition", projectPath, symbol),
  onBrowserOpenTab: (callback: (event: { url: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { url: string }) => callback(payload);
    ipcRenderer.on("lazify:browser-open-tab", listener);
    return () => ipcRenderer.removeListener("lazify:browser-open-tab", listener);
  },
  getAgentUsage: (sinceIso?: string, agentIds?: string[]): Promise<AgentUsageReport> =>
    ipcRenderer.invoke("lazify:agent-usage", sinceIso, agentIds),
  setAgentBudget: (agentId: string, weeklyTokens: number): Promise<Record<string, number>> =>
    ipcRenderer.invoke("lazify:set-agent-budget", agentId, weeklyTokens),
  openAgentTerminal: (
    agentId: string,
    projectPath: string,
    cols?: number,
    rows?: number
  ): Promise<{ runId: string }> =>
    ipcRenderer.invoke("lazify:open-agent-terminal", agentId, projectPath, cols, rows),
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
  fixProjectPackageVersions: (projectPath: string): Promise<import("../main/workflow-engine").WorkflowResult> =>
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
