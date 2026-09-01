import { atom } from "jotai";

import type { CommandChoicePrompt } from "@main/command-runner";
import type { StarterFailureReason } from "@main/scaffolding/starter-provisioner";
import type {
	EnvironmentSummary,
	ImportedTemplateOption,
	ImportedTemplateSnapshot,
	LogEntry,
	SyncedWorkspaceProject,
	TemplateOption,
	ToolScanReport,
	WorkflowStatus,
} from "@renderer/shared/types/lazify";

import {
	readStoredActiveProjectPath,
	readStoredProjectDirectory,
	readStoredWorkspaceProjects,
} from "./storage";

export const projectNameAtom = atom("lazify-starter");

export const projectDirectoryAtom = atom(readStoredProjectDirectory());

export const activeProjectPathAtom = atom(readStoredActiveProjectPath());

export const packageNameAtom = atom("");

export const initSourceModeAtom = atom<"stack" | "imported">("stack");

export const selectedTemplateIdAtom = atom("");
/** Scaffolder toggles chosen in the pre-flight panel, keyed by option key. */

/** Scaffolder toggles chosen in the pre-flight panel, keyed by option key. */
export const createOptionValuesAtom = atom<Record<string, boolean>>({});

export const selectedImportedTemplateIdAtom = atom("");

export const selectedImportedTemplateAtom = atom<ImportedTemplateSnapshot | null>(null);

export const logsAtom = atom<LogEntry[]>([]);

export const commandChoicePromptAtom = atom<CommandChoicePrompt | null>(null);

export const busyAtom = atom(false);

export const workflowStatusAtom = atom<WorkflowStatus>("idle");

export const statusMessageAtom = atom("Checking local runtime prerequisites.");
/** Set only when a starter clone failed, so the console can say why in plain words. */

/** Set only when a starter clone failed, so the console can say why in plain words. */
export const starterFailureReasonAtom = atom<StarterFailureReason | null>(null);

export const environmentAtom = atom<EnvironmentSummary | null>(null);

export const templateOptionsAtom = atom<TemplateOption[]>([
	{
		id: "expo-default",
		label: "Expo Starter",
		description: "Default Expo template.",
	},
]);

export const importedTemplateOptionsAtom = atom<ImportedTemplateOption[]>([]);

export const syncedWorkspaceProjectsAtom = atom<SyncedWorkspaceProject[]>(
	readStoredWorkspaceProjects(),
);

export const toolScanReportAtom = atom<ToolScanReport | null>(null);

export const toolScanLoadingAtom = atom(false);
