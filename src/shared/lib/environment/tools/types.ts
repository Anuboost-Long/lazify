export type ToolCategory = "agents" | "nodejs" | "python" | "dotnet" | "system";

export interface DetectedTool {
  name: string;
  displayName: string;
  available: boolean;
  version: string | null;
  category: ToolCategory;
  installCommand: string | null;
  installNote: string | null;
  updateCommand: string | null;
  /** Null for everything the app will not take off the machine. */
  uninstallCommand: string | null;
}

export interface ToolUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string | null;
  canCheck: boolean;
}

export interface ToolScanReport {
  tools: DetectedTool[];
}

/** What a probe found: whether the tool answered, and what it said. */
export interface ToolProbe {
  available: boolean;
  version: string | null;
}

/** A command to run, and anything the user needs to know before running it. */
export interface ToolCommand {
  command: string;
  note?: string;
}

/**
 * One tool, and everything the environment pane can ask of it.
 *
 * Each tool owns its own answers because almost every one of them differs by
 * platform in its own way — Python is `python` on Windows, Go is packaged under
 * three different names on Linux, Docker is a cask on macOS and a daemon
 * everywhere else. Kept in one table those differences read as noise; kept
 * beside the tool they read as what they are.
 *
 * Everything but `probe` is optional: a tool Lazify only detects — because it
 * arrives with something else, or because there is no sane way to install it
 * from a GUI — simply does not answer those.
 */
export interface ToolModule {
  readonly name: string;
  readonly displayName: string;
  readonly category: ToolCategory;

  probe(): Promise<ToolProbe>;

  /** Offered only when the tool is missing. */
  install?(): ToolCommand | null;
  /** Offered only when the tool is present. */
  update?(): string | null;
  /** Offered only when the tool is present. */
  uninstall?(): ToolCommand | null;
  /** Whether a newer version exists. Absent when the tool cannot be asked. */
  checkUpdate?(currentVersion: string): Promise<ToolUpdateInfo>;

  /**
   * Actions that have to run with the nvm-managed node sourced first. An npm
   * global installed under it is invisible to a plain login shell, so the
   * command would either miss the tool or install a second copy elsewhere.
   */
  readonly nvmActions?: ReadonlyArray<"install" | "update" | "uninstall">;
}

/** The answer for a tool that exists but cannot be asked about updates. */
export const CANNOT_CHECK: ToolUpdateInfo = {
  hasUpdate: false,
  latestVersion: null,
  canCheck: false
};
