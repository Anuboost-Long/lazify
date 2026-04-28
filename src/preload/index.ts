import { contextBridge, ipcRenderer } from "electron";

import type { LogEvent } from "../main/command-runner";
import type { TemplateDefinition } from "../main/harmonizer";
import type { EnvironmentScan } from "../main/scanner";
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
  selectDirectory: (): Promise<string | null> => ipcRenderer.invoke("lazify:select-directory"),
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
