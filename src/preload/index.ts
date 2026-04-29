import { contextBridge, ipcRenderer } from "electron";

import type { LogEvent } from "../main/command-runner";
import type { TemplateDefinition } from "../main/harmonizer";
import type { NpmPackageSearchResult } from "../main/npm-registry";
import type {
  ImportedProjectIndexResult,
  ImportedProjectScanResult
} from "../renderer/shared/types/lazify";
import type { EnvironmentScan } from "../main/scanner";
import type { TemplatePackageEntry } from "../main/template-package-manifest";
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
  listTemplates: (): Promise<TemplateDefinition[]> => ipcRenderer.invoke("lazify:templates"),
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
