import { contextBridge, ipcRenderer } from "electron";

import type { LogEvent } from "../main/command-runner";
import type { TemplateDefinition } from "../main/harmonizer";
import type { NpmPackageSearchResult } from "../main/npm-registry";
import type {
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
import type { VersionMatchReport } from "../brain/package-version-matcher";
import type {
  CreateProjectPayload,
  InstallPackagePayload,
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
  onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: WorkflowProgressEvent) => callback(payload);
    ipcRenderer.on("lazify:workflow-progress", listener);
    return () => ipcRenderer.removeListener("lazify:workflow-progress", listener);
  }
};

contextBridge.exposeInMainWorld("lazify", lazifyApi);
