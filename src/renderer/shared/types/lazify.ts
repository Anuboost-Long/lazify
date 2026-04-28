export type Stream = "stdout" | "stderr" | "system";

export interface LogEntry {
  key: string;
  timestamp: string;
  stream: Stream;
  message: string;
}

export interface TemplateOption {
  id: string;
  label: string;
  description: string;
}

export interface EnvironmentSummary {
  nodeVersion: string;
  npmVersion: string;
  yarnVersion: string;
}

export type WorkflowStatus = "idle" | "running" | "success" | "error";
