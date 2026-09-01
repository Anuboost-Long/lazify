import { CommandRunner } from "../command-runner";
import { createProject } from "./workflow/create";
import { finalizeProject } from "./workflow/finalize";
import {
	addProjectPackage,
	installPackage,
	installProjectDependencies,
	removeProjectPackage,
} from "./workflow/packages";
import { discardPreparedProject, prepareProject } from "./workflow/prepare";
import type {
	AddProjectPackagePayload,
	CreateProjectPayload,
	FinalizeProjectPayload,
	InstallPackagePayload,
	PrepareProjectResult,
	ProgressEmitter,
	RemoveProjectPackagePayload,
	WorkflowContext,
	WorkflowResult,
} from "./workflow/types";

export type {
	AddProjectPackagePayload,
	CreateProjectPayload,
	FinalizeProjectPayload,
	InstallPackagePayload,
	PrepareProjectResult,
	RemoveProjectPackagePayload,
	WorkflowContext,
	WorkflowProgressEvent,
	WorkflowResult,
} from "./workflow/types";

export class WorkflowEngine {
	private readonly ctx: WorkflowContext;

	constructor(commandRunner: CommandRunner, emitProgress: ProgressEmitter) {
		this.ctx = { commandRunner, emitProgress };
	}

	createProject(payload: CreateProjectPayload): Promise<WorkflowResult> {
		return createProject(this.ctx, payload);
	}

	prepareProject(payload: CreateProjectPayload): Promise<PrepareProjectResult> {
		return prepareProject(this.ctx, payload);
	}

	finalizeProject(payload: FinalizeProjectPayload): Promise<WorkflowResult> {
		return finalizeProject(this.ctx, payload);
	}

	discardPreparedProject(projectPath: string): Promise<{ removed: boolean }> {
		return discardPreparedProject(this.ctx, projectPath);
	}

	installPackage(payload: InstallPackagePayload): Promise<WorkflowResult> {
		return installPackage(this.ctx, payload);
	}

	addProjectPackage(payload: AddProjectPackagePayload): Promise<WorkflowResult> {
		return addProjectPackage(this.ctx, payload);
	}

	installProjectDependencies(projectPath: string): Promise<WorkflowResult> {
		return installProjectDependencies(this.ctx, projectPath);
	}

	removeProjectPackage(payload: RemoveProjectPackagePayload): Promise<WorkflowResult> {
		return removeProjectPackage(this.ctx, payload);
	}
}
