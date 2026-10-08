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
