import type { ProjectTreeNode } from "../../../renderer/shared/types/lazify";
import type { CommandRunner } from "../../command-runner";
import type { StarterOptionalFolder } from "../starter-descriptor";
import type { StarterFailureReason } from "../starter-provisioner";

export interface WorkflowProgressEvent {
	workflowId: string;
	status: "idle" | "running" | "success" | "error";
	step: string;
	message: string;
}

export interface WorkflowResult {
	success: boolean;
	message: string;
	projectPath?: string;
	/** Set only when a starter clone failed, so the UI can name the cause. */
	reason?: StarterFailureReason;
}

export interface CreateProjectPayload {
	name: string;
	baseDirectory: string;
	sourceMode: "stack" | "imported";
	templateId?: string | null;
	importedTemplateId?: string | null;
	structureTree: ProjectTreeNode[];
	/** Keyed by TemplateCreateOption.key; missing keys fall back to the option default. */
	createOptions?: Record<string, boolean>;
}

export interface PrepareProjectResult {
	success: boolean;
	message: string;
	projectPath?: string;
	reason?: StarterFailureReason;
	/** Folders the starter offers but does not ship; empty for a CLI project. */
	optionalFolders?: StarterOptionalFolder[];
	/** Paths the picker may not remove. */
	required?: string[];
}

export interface FinalizeProjectPayload {
	projectPath: string;
	/** Project-relative paths the user unticked. Anything in `required` is ignored. */
	removePaths?: string[];
	/** Project-relative optional folders the user ticked, each created with a .gitkeep. */
	optionalFolderPaths?: string[];
}

export interface InstallPackagePayload {
	packageName: string;
	baseDirectory: string;
	projectName: string;
}

export interface AddProjectPackagePayload {
	projectPath: string;
	packageName: string;
	dev?: boolean;
}

export interface RemoveProjectPackagePayload {
	projectPath: string;
	packageName: string;
}

export type ProgressEmitter = (event: WorkflowProgressEvent) => void;

export interface WorkflowContext {
	commandRunner: CommandRunner;
	emitProgress: ProgressEmitter;
}
