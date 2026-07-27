export type Stream = "stdout" | "stderr" | "system";

export interface LogEntry {
  key: string;
  timestamp: string;
  stream: Stream;
  message: string;
}

export interface TemplateCreateOption {
  key: string;
  label: string;
  default: boolean;
  onFlag: string;
  offFlag: string;
}

export interface TemplateOption {
  id: string;
  label: string;
  description: string;
  createOptions?: TemplateCreateOption[];
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
  | "dotnet"
  | "unknown";

export type DetectedPackageManager = "npm" | "yarn" | "pnpm" | "bun" | "dotnet" | "unknown";

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
  framework: "react" | "react-native" | "node" | "electron" | "dotnet" | "unknown";
  metaFramework:
    | "vite"
    | "nextjs"
    | "expo"
    | "react-native-cli"
    | "cra"
    | "express"
    | "electron"
    | "aspnet"
    | "blazor"
    | "maui"
    | "dotnet-console"
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

export interface TokenTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
  /** Billed responses, i.e. assistant turns. */
  messages: number;
}

export interface AgentRateLimit {
  /** "reported" comes from the agent's own transcripts; "budget" is user-set. */
  source: "reported" | "budget";
  usedPercent: number;
  windowMinutes: number | null;
  resetsAt: string | null;
  planType: string | null;
  observedAt: string;
}

/** The rolling 5-hour block both CLIs meter against. */
export interface AgentSessionWindow {
  /** "reported" is the account's own percentage; "derived" is read off transcripts. */
  source: "reported" | "derived";
  startsAt: string;
  resetsAt: string;
  hours: number;
  totals: TokenTotals;
  /** User-set token allowance for one block, when they set one. */
  budget: number | null;
  usedPercent: number | null;
  /** When a reported percentage was last refreshed by the agent CLI. */
  observedAt: string | null;
}

export interface AgentUsageSummary {
  agentId: string;
  label: string;
  /** False when the agent has no local transcripts to read. */
  hasData: boolean;
  session: TokenTotals;
  today: TokenTotals;
  week: TokenTotals;
  allTime: TokenTotals;
  /** Daily totals for the last 30 days, oldest first. */
  history: { date: string; total: number }[];
  lastActivity: string | null;
  rateLimit: AgentRateLimit | null;
  weeklyBudget: number | null;
  blockBudget: number | null;
  /** Null only when the agent has no transcripts at all to read a block from. */
  sessionWindow: AgentSessionWindow | null;
}

export interface AgentUsageReport {
  generatedAt: string;
  /** Start of the "session" window the totals were measured against. */
  since: string | null;
  agents: AgentUsageSummary[];
}

/** One working-tree file plus its line counts, used by the agent changes panel. */
export interface AgentFileChange {
  path: string;
  absolutePath: string;
  statusLabel: string;
  untracked: boolean;
  additions: number;
  deletions: number;
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

// ─── Project Health ───────────────────────────────────────────────────────────

export interface OutdatedPackageInfo {
  current: string;
  wanted: string;
  latest: string;
  dependent: string;
  location: string;
}

export interface NpmOutdatedResult {
  packages: Record<string, OutdatedPackageInfo>;
  error?: string;
}

export type AuditSeverity = "critical" | "high" | "moderate" | "low" | "info";

export interface AuditVulnerabilitySource {
  source: number;
  name: string;
  dependency: string;
  title: string;
  url: string;
  severity: AuditSeverity;
  range: string;
}

export interface AuditFixInfo {
  name: string;
  version: string;
  isSemVerMajor: boolean;
}

export interface AuditVulnerability {
  name: string;
  severity: AuditSeverity;
  isDirect: boolean;
  via: Array<string | AuditVulnerabilitySource>;
  effects: string[];
  range: string;
  nodes: string[];
  fixAvailable: boolean | AuditFixInfo;
}

export interface AuditVulnerabilityCounts {
  info: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
  total: number;
}

export interface NpmAuditResult {
  auditReportVersion?: number;
  vulnerabilities: Record<string, AuditVulnerability>;
  metadata: {
    vulnerabilities: AuditVulnerabilityCounts;
    dependencies: {
      prod: number;
      dev: number;
      optional: number;
      peer: number;
      peerOptional: number;
      total: number;
    };
  };
  error?: string;
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
  /** True when the agent is currently believed to be waiting on the user. */
  waiting: boolean;
  /** True for agent runs, false for scripts — only agents can be typed into. */
  isAgent: boolean;
}
