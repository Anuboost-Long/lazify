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

/**
 * Where an install has got to.
 *
 * `queued` is the moment before the registry answers, which on a slow network
 * is the longest silence of the whole thing — it is a stage of its own so the
 * card can say something rather than sit still.
 */
export type InstallStage = "queued" | "downloading" | "unpacking" | "done" | "failed";

export interface InstallJob {
	/** The extension being installed, which is what the card matches on. */
	id: string;
	stage: InstallStage;
	receivedBytes: number;
	/** What the server declared, or null where it declared nothing. */
	totalBytes: number | null;
	/** What went wrong, for the card that has to say so. */
	error: string | null;
	startedAt: string;
}

/** What the manager tells the job registry as an install moves along. */
export type InstallProgress =
	| { stage: "downloading"; receivedBytes: number; totalBytes: number | null }
	| { stage: "unpacking" };
