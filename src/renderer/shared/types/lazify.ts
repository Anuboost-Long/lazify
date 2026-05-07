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

export interface ImportedTemplateOption {
  id: string;
  name: string;
  description: string;
  sourceProjectPath: string;
  savedAt: string;
  fileCount: number;
  stack: ProjectStack;
}

export type FileRole =
  | "entry-point"
  | "config"
  | "api"
  | "ui"
  | "hook"
  | "type"
  | "asset"
  | "style"
  | "state"
  | "navigation"
  | "service"
  | "unknown";

export type FolderRole =
  | "ui-layer"
  | "data-layer"
  | "shared-ui"
  | "static"
  | "types"
  | "navigation"
  | "state"
  | "services"
  | "config"
  | "unknown";

export type ProjectStack =
  | "react-vite"
  | "react-next"
  | "react-cra"
  | "react-unknown"
  | "react-native-expo"
  | "react-native-cli"
  | "node-api"
  | "electron"
  | "unknown";

export type DetectedPackageManager = "npm" | "yarn" | "pnpm" | "bun" | "unknown";

export interface PackageOption {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  publisher: string | null;
}

export interface SavedInitWorkflowConfig {
  sourceMode: "stack" | "imported";
  templateId: string | null;
  importedTemplateId: string | null;
  importedTemplateName: string | null;
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

export interface TemplateFileNode {
  id: string;
  name: string;
  path: string;
  type: "file";
  extension: string;
  size?: number;
  role?: FileRole;
  includeContent: boolean;
  content?: string;
  isBinary: boolean;
  locked?: boolean;
  source?: "imported" | "custom" | "generated";
}

export interface TemplateFolderNode {
  id: string;
  name: string;
  path: string;
  type: "folder";
  role?: FolderRole;
  locked?: boolean;
  source?: "imported" | "custom" | "generated";
}

export type TemplateTreeNode = TemplateFileNode | (TemplateFolderNode & { children: TemplateTreeNode[] });

export interface StackDetectionResult {
  stack: ProjectStack;
  framework: "react" | "react-native" | "node" | "electron" | "unknown";
  metaFramework:
    | "vite"
    | "nextjs"
    | "expo"
    | "react-native-cli"
    | "cra"
    | "express"
    | "electron"
    | "unknown";
  packageManager: DetectedPackageManager;
  commands: {
    install: string;
    dev?: string;
    start?: string;
    build?: string;
    preview?: string;
    test?: string;
    lint?: string;
    android?: string;
    ios?: string;
    web?: string;
  };
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface ImportedProjectScanResult {
  projectName: string;
  projectPath: string;
  stackDetection: StackDetectionResult;
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
  stackDetection: StackDetectionResult;
  tree: ImportedProjectIndexNode[];
}

export interface GitStatusEntry {
  path: string;
  absolutePath: string;
  stagedStatus: string;
  unstagedStatus: string;
  statusLabel: string;
}

export interface ProjectGitStatusResult {
  projectPath: string;
  repoRoot: string | null;
  remoteUrl: string | null;
  branch: string | null;
  branches: string[];
  isGitRepo: boolean;
  hasUncommittedChanges: boolean;
  entries: GitStatusEntry[];
}

export interface SyncedWorkspaceProject {
  id: string;
  projectName: string;
  projectPath: string;
  stack: ProjectStack;
  framework: StackDetectionResult["framework"];
  metaFramework: StackDetectionResult["metaFramework"];
  packageManager: DetectedPackageManager;
  confidence: number;
  lastSyncedAt: string;
  nodeVersion?: string | null;
}

export interface ImportedTemplateSnapshot {
  id: string;
  name: string;
  description: string;
  sourceProjectPath: string;
  savedAt: string;
  fileCount: number;
  stackDetection: StackDetectionResult;
  structure: {
    files: TemplateFileNode[];
    folders: TemplateFolderNode[];
    tree?: TemplateTreeNode[];
  };
  features: string[];
  tags: string[];
  metadata: {
    createdAt: string;
    updatedAt?: string;
    fileCount: number;
    folderCount: number;
    selectedItemCount: number;
    originalFileCount?: number;
  };
  tree: ProjectTreeNode[];
}

export interface EnvironmentSummary {
  nodeVersion: string;
  npmVersion: string;
  yarnVersion: string;
}

export type WorkflowStatus = "idle" | "running" | "success" | "error";

export type ToolCategory = "nodejs" | "python" | "dotnet" | "system";

export interface DetectedTool {
  name: string;
  displayName: string;
  available: boolean;
  version: string | null;
  category: ToolCategory;
  installCommand: string | null;
  installNote: string | null;
  updateCommand: string | null;
}

export interface ToolUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string | null;
  canCheck: boolean;
}

export interface ToolScanReport {
  tools: DetectedTool[];
}

export interface NvmNodeVersion {
  version: string;
  lts: string | null;
  current: boolean;
}

export interface NvmVersionList {
  nvmAvailable: boolean;
  versions: NvmNodeVersion[];
}

export interface NvmInstallResult {
  success: boolean;
  output: string;
  platform: "macos" | "linux" | "windows" | "unknown";
}

export interface NvmActionResult {
  success: boolean;
  output: string;
}

export type MatchAction = "keep" | "update" | "downgrade";
export type CompatibilityStatus = "compatible" | "incompatible" | "unknown";

export interface PackageMatch {
  name: string;
  currentSpec: string;
  currentVersion: string;
  targetVersion: string | null;
  action: MatchAction;
  compatibility: CompatibilityStatus;
  reason: string;
}

export interface VersionMatchReport {
  projectPath: string;
  anchorPackage: string;
  anchorVersion: string;
  packages: PackageMatch[];
  unresolved: string[];
  installPlan: string[];
}

export interface InstalledPackage {
  name: string;
  versionSpec: string;
  isDev: boolean;
}

export interface ScriptStatusEvent {
  runId: string;
  scriptName: string;
  status: "running" | "done" | "error";
  exitCode: number | null;
}

export interface SessionPort {
  port: number;
  command: string;
  address: string;
}

export interface PtySession {
  runId: string;
  scriptName: string;
  projectPath: string;
  projectName: string;
  pid: number;
  startedAt: string;
  ports: SessionPort[];
}
