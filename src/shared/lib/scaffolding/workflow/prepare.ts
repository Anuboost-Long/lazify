import { createFolder, deletePath, pathExists } from "@/platform/folders";
import path from "@/shared/lib/path";

import { scanEnvironment } from "../../environment/scanner";
import type { CommandBinary } from "../../environment/scanner";
import type { StarterSource } from "../catalog";
import { getTemplate } from "../harmonizer";
import type { TemplateDefinition } from "../harmonizer";
import {
	createStagingRoot,
	materializePreparedProject,
	rememberPreparedProject,
} from "../prepared-projects";
import type { PreparedProject } from "../prepared-projects";
import type { StarterDescriptor } from "../starter-descriptor";
import { StarterError, provisionStarter } from "../starter-provisioner";
import { resolveTemplateCommand, resolveUserPath } from "./paths";
import type { CreateProjectPayload, PrepareProjectResult, WorkflowContext } from "./types";

/**
 * Step one of two. Produces a temporary project tree — a starter clone or the
 * framework CLI's output — and stops there, so the picker can browse the real
 * thing before it is placed in the workspace. `finalizeProject` finishes the
 * job, and `discardPreparedProject` backs it out.
 */
export async function prepareProject(
	ctx: WorkflowContext,
	payload: CreateProjectPayload,
): Promise<PrepareProjectResult> {
	const workflowId = `create-${Date.now()}`;
	const environment = await scanEnvironment();

	if (environment.issues.length > 0) {
		throw new Error(environment.issues.join(" "));
	}

	if (!payload.templateId) {
		throw new Error("Choose a stack before creating the project.");
	}

	const template = getTemplate(payload.templateId);
	const baseDirectory = await resolveUserPath(payload.baseDirectory);
	const destinationPath = path.resolve(baseDirectory, payload.name);

	if (await pathExists(destinationPath)) {
		throw new Error(
			`A project already exists at ${destinationPath}. Open it from Workspace instead of creating a new one.`,
		);
	}

	const stagingRoot = await createStagingRoot();
	const projectPath = path.resolve(stagingRoot, payload.name);

	// Tier 1: the stack has a starter repo, so the project is a clone of a real
	// application rather than CLI output with a tree synthesized over it.
	if (template.starter) {
		return prepareFromStarter(ctx, {
			workflowId,
			template,
			starter: template.starter,
			projectPath,
			destinationPath,
			stagingRoot,
			projectName: payload.name,
		});
	}

	let createCommand: CommandBinary;

	try {
		createCommand = await resolveTemplateCommand(template);
	} catch (error) {
		await deletePath(stagingRoot);
		throw error;
	}

	const createArgs = template.createCommands[createCommand];

	if (!createArgs) {
		await deletePath(stagingRoot);
		throw new Error(`Template "${template.label}" does not support ${createCommand}.`);
	}

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "preflight",
		message: `Environment ready. Using ${createCommand} for ${template.label}.`,
	});

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "create-project",
		message: "Preparing project files.",
	});

	// Some scaffolders (create-next-app) declare negated boolean flags like
	// --no-tailwind that swallow a trailing positional, so the project name
	// cannot simply be appended. Templates mark the correct slot with
	// {{projectName}}; anything without a marker keeps the old append behavior.
	const nameMarker = "{{projectName}}";
	const resolvedArgs = createArgs.includes(nameMarker)
		? createArgs.map((arg) => (arg === nameMarker ? payload.name : arg))
		: [...createArgs, payload.name];

	// Option flags go last: the name is already positioned, so there is no
	// trailing positional left for a negated flag to swallow.
	const optionFlags = (template.createOptions ?? []).map((option) =>
		(payload.createOptions?.[option.key] ?? option.default) ? option.onFlag : option.offFlag,
	);

	const createResult = await ctx.commandRunner.runCommand({
		command: createCommand,
		args: [...resolvedArgs, ...optionFlags],
		cwd: stagingRoot,
	});

	if (!createResult.success) {
		await deletePath(stagingRoot);

		ctx.emitProgress({
			workflowId,
			status: "error",
			step: "create-project",
			message: "Project creation failed.",
		});

		return {
			success: false,
			message: "Project creation failed.",
		};
	}

	// Tier 2 has no starter descriptor, so nothing is protected from removal and
	// there are no optional folders to offer — the picker just reads the tree.
	rememberPreparedProject({
		projectPath,
		destinationPath,
		stagingRoot,
		templateId: template.id,
		optionalFolders: [],
		required: [],
	});

	return {
		success: true,
		message: "Project files are ready to review.",
		projectPath,
		optionalFolders: [],
		required: [],
	};
}

/** Tier 1 step one: clone the starter and stop, so the picker sees the real tree. */
export async function prepareFromStarter(
	ctx: WorkflowContext,
	options: {
		workflowId: string;
		template: TemplateDefinition;
		starter: StarterSource;
		projectPath: string;
		destinationPath: string;
		stagingRoot: string;
		projectName: string;
	},
): Promise<PrepareProjectResult> {
	const { workflowId, template, starter, projectPath, destinationPath, stagingRoot, projectName } =
		options;

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "preflight",
		message: `Environment ready. Using the ${template.label} starter.`,
	});

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "create-project",
		message: `Cloning ${starter.repo} at ${starter.ref} into ${projectPath}.`,
	});

	let descriptor: StarterDescriptor;

	try {
		descriptor = await provisionStarter({
			repo: starter.repo,
			ref: starter.ref,
			projectPath,
			projectName,
		});
	} catch (error) {
		const failure =
			error instanceof StarterError
				? error
				: new StarterError("clone-failed", (error as Error).message);

		// A partial clone is worse than none, and all of it lives in staging.
		await deletePath(stagingRoot);

		// The message carries git's own words, which is what makes a log useful.
		// Turning the reason into something a person should read is the UI's job.
		ctx.emitProgress({
			workflowId,
			status: "error",
			step: "create-project",
			message: failure.message,
		});

		return { success: false, message: failure.message, reason: failure.reason };
	}

	rememberPreparedProject({
		projectPath,
		destinationPath,
		stagingRoot,
		templateId: template.id,
		optionalFolders: descriptor.optionalFolders,
		required: descriptor.required,
	});

	const message = `Prepared ${starter.repo}.`;

	// Running, not success: the project is not finished until it is installed.
	ctx.emitProgress({ workflowId, status: "running", step: "starter-ready", message });

	return {
		success: true,
		message,
		projectPath,
		optionalFolders: descriptor.optionalFolders,
		required: descriptor.required,
	};
}

/** Places the reviewed tree in the selected workspace only when Create Project is pressed. */
export async function materializePrepared(
	_ctx: WorkflowContext,
	prepared: PreparedProject,
): Promise<void> {
	if (await pathExists(prepared.destinationPath)) {
		throw new Error(
			`A project already exists at ${prepared.destinationPath}. Open it from Workspace instead of creating a new one.`,
		);
	}

	await createFolder(path.dirname(prepared.destinationPath));
	await materializePreparedProject(prepared);
}

