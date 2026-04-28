/// <reference types="vite/client" />

import type { LogEvent, CommandResult } from "../main/command-runner";
import type { TemplateDefinition } from "../main/harmonizer";
import type { EnvironmentScan } from "../main/scanner";
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
      selectDirectory: () => Promise<string | null>;
      onLog: (callback: (event: LogEvent) => void) => () => void;
      onWorkflowProgress: (callback: (event: WorkflowProgressEvent) => void) => () => void;
    };
  }
}

export {};
