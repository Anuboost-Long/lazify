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
