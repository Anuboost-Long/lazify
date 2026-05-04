/// <reference types="vite/client" />

import type { LogEvent, CommandResult } from "../main/command-runner";
import type { TemplateDefinition } from "../main/harmonizer";
import type { NpmPackageSearchResult } from "../main/npm-registry";
import type { EnvironmentScan } from "../main/scanner";
import type { TemplatePackageEntry } from "../main/template-package-manifest";
import type {
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

declare global {
  interface Window {
    lazify: {
      runCommand: (command: string, args: string[], cwd?: string) => Promise<CommandResult>;
      createProject: (payload: CreateProjectPayload) => Promise<WorkflowResult>;
      installPackage: (payload: InstallPackagePayload) => Promise<WorkflowResult>;
      checkEnvironment: () => Promise<EnvironmentScan>;
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
      saveImportedTemplate: (
        projectPath: string,
        includedRelativePaths: string[],
        providedName?: string | null,
        confirmedStack?: string | null
      ) => Promise<ImportedTemplateSnapshot>;
      onLog: (callback: (event: LogEvent) => void) => () => void;
      onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => () => void;
    };
  }
}

export {};
