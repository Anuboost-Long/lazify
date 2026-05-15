/// <reference types="vite/client" />

import type { LogEvent, CommandResult } from "../main/command-runner";
import type { TemplateDefinition } from "../main/harmonizer";
import type { NpmPackageSearchResult } from "../main/npm-registry";
import type { EnvironmentScan } from "../main/scanner";
import type { ToolScanReport, NvmVersionList, NvmInstallResult, NvmActionResult, ToolUpdateInfo } from "../main/environment-scanner";
import type { TemplatePackageEntry } from "../main/template-package-manifest";
import type {
  NpmAuditResult,
  NpmOutdatedResult,
  ProjectGitStatusResult,
  ImportedTemplateOption,
  ImportedTemplateSnapshot,
  ImportedProjectIndexResult,
  ImportedProjectScanResult,
  ProjectTreeNode
} from "./shared/types/lazify";
import type {
  CreateProjectPayload,
  InstallPackagePayload,
  WorkflowProgressEvent,
  WorkflowResult
} from "../main/workflow-engine";
import type { VersionMatchReport } from "./shared/types/lazify";

declare global {
  interface Window {
    lazify: {
      runCommand: (command: string, args: string[], cwd?: string) => Promise<CommandResult>;
      createProject: (payload: CreateProjectPayload) => Promise<WorkflowResult>;
      installPackage: (payload: InstallPackagePayload) => Promise<WorkflowResult>;
      checkEnvironment: () => Promise<EnvironmentScan>;
      scanTools: (force?: boolean) => Promise<ToolScanReport>;
      probeTool: (name: string) => Promise<import("../renderer/shared/types/lazify").DetectedTool | null>;
      nvmListVersions: () => Promise<NvmVersionList>;
      installNvm: () => Promise<NvmInstallResult>;
      nvmSetDefault: (version: string) => Promise<NvmActionResult>;
      nvmUse: (version: string) => Promise<NvmActionResult>;
      installTool: (toolName: string) => Promise<NvmActionResult>;
      checkToolUpdate: (toolName: string, currentVersion: string) => Promise<ToolUpdateInfo>;
      updateTool: (toolName: string) => Promise<NvmActionResult>;
      relaunchApp: () => Promise<void>;
      listTemplates: () => Promise<TemplateDefinition[]>;
      listImportedTemplates: () => Promise<ImportedTemplateOption[]>;
      getImportedTemplate: (templateId: string) => Promise<ImportedTemplateSnapshot>;
      updateImportedTemplate: (
        templateId: string,
        updates: { name?: string | null; tree?: ProjectTreeNode[] | null }
      ) => Promise<ImportedTemplateSnapshot>;
      deleteImportedTemplate: (templateId: string) => Promise<void>;
      getTemplatePackageManifest: (templateId: string) => Promise<TemplatePackageEntry[]>;
      searchNpmPackages: (query: string) => Promise<NpmPackageSearchResult[]>;
      selectDirectory: () => Promise<string | null>;
      importProjectFromDirectory: (projectPath: string) => Promise<ImportedProjectScanResult>;
      importProjectIndexFromDirectory: (projectPath: string) => Promise<ImportedProjectIndexResult>;
      readImportedProjectFile: (filePath: string) => Promise<string>;
      getProjectGitStatus: (projectPath: string) => Promise<ProjectGitStatusResult>;
      getNpmOutdated: (projectPath: string) => Promise<NpmOutdatedResult>;
      getNpmAudit: (projectPath: string) => Promise<NpmAuditResult>;
      listSessions: () => Promise<import("./shared/types/lazify").PtySession[]>;
      listScripts: (projectPath: string) => Promise<Record<string, string>>;
      runScript: (projectPath: string, scriptName: string, cols?: number, rows?: number) => Promise<{ runId: string; ptyAvailable: boolean }>;
      stopScript: (runId: string) => Promise<void>;
      ptyWrite: (runId: string, data: string) => void;
      ptyResize: (runId: string, cols: number, rows: number) => void;
      onPtyData: (callback: (event: { runId: string; data: string }) => void) => () => void;
      onScriptStatus: (callback: (event: import("./shared/types/lazify").ScriptStatusEvent) => void) => () => void;
      listProjectPackages: (projectPath: string) => Promise<import("./shared/types/lazify").InstalledPackage[]>;
      addProjectPackage: (payload: import("../main/workflow-engine").AddProjectPackagePayload) => Promise<import("../main/workflow-engine").WorkflowResult>;
      removeProjectPackage: (payload: import("../main/workflow-engine").RemoveProjectPackagePayload) => Promise<import("../main/workflow-engine").WorkflowResult>;
      saveImportedTemplate: (
        projectPath: string,
        includedRelativePaths: string[],
        providedName?: string | null,
        confirmedStack?: string | null
      ) => Promise<ImportedTemplateSnapshot>;
      matchPackageVersions: (projectPath: string) => Promise<VersionMatchReport>;
      fixProjectPackageVersions: (projectPath: string) => Promise<WorkflowResult>;
      onLog: (callback: (event: LogEvent) => void) => () => void;
      onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => () => void;
    };
  }
}

export {};
