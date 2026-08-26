import type { ExtensionRequirement } from "./providers/types";

export interface ExtensionCatalogEntry {
	id: string;
	namespace: string;
	name: string;
	displayName: string;
	summary: string;
	homepage: string;
}

export interface RegistryRelease {
	version: string;
	license: string | null;
	publishedAt: string | null;
	downloadUrl: string;
}

export type ExtensionStatus = "not-installed" | "installed" | "update-available";

export interface InstalledExtension {
	version: string;
	enabled: boolean;
	installedAt: string;
}

export interface ExtensionState {
	entry: ExtensionCatalogEntry;
	installed: InstalledExtension | null;
	latest: RegistryRelease | null;
	status: ExtensionStatus;
	unreachable: boolean;
	requirement: ExtensionRequirement;
}

export type InstalledRecord = Record<string, InstalledExtension>;
