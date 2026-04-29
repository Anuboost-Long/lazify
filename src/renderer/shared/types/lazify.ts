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

export interface PackageOption {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  publisher: string | null;
}

export interface SavedInitWorkflowConfig {
  templateId: string;
  projectName: string;
  projectDirectory: string;
  packageNames: string[];
}

export interface ProjectTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  source: "cli" | "module" | "custom";
  locked: boolean;
  content?: string;
  children: ProjectTreeNode[];
}

export interface ImportedProjectScanResult {
  projectName: string;
  projectPath: string;
  tree: ProjectTreeNode[];
}

export interface ImportedProjectIndexNode {
  id: string;
  name: string;
  type: "file" | "folder";
  relativePath: string;
  absolutePath: string;
  children: ImportedProjectIndexNode[];
}

export interface ImportedProjectIndexResult {
  projectName: string;
  projectPath: string;
  tree: ImportedProjectIndexNode[];
}

export interface EnvironmentSummary {
  nodeVersion: string;
  npmVersion: string;
  yarnVersion: string;
}

export type WorkflowStatus = "idle" | "running" | "success" | "error";
