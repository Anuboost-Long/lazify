import type { ExtensionCatalogEntry } from "../types";

export interface ServerLaunch {
	command: string;
	args: string[];
	env: Record<string, string>;
}

export interface ExtensionRequirement {
	satisfied: boolean;
	/** Translation key naming what is missing, or null when nothing is. */
	label: string | null;
	/** The same thing in prose, for the manifest an agent reads. */
	note: string | null;
	helpUrl: string | null;
}

export const MET: ExtensionRequirement = {
	satisfied: true,
	label: null,
	note: null,
	helpUrl: null,
};

export interface ExtensionProvider {
	entry: ExtensionCatalogEntry;
	settingsSection: string;
	diagnosticSource: string;
	/** Relative path that proves the unpack landed something runnable. */
	serverMarker: string;
	launch: (unpackedRoot: string) => ServerLaunch | null;
	requirement: () => ExtensionRequirement;
	languageIdFor: (filePath: string) => string | null;
	defaultSettings: () => Record<string, unknown>;
	initializationOptions: (projectPath: string) => Record<string, unknown>;
	ruleUrl: (code: string) => string | null;
}
