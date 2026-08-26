import type { PackageManager } from "../../environment/scanner";
import { getAutoFixArgs, getInstallCommand, summarizeAutoFix } from "../harmonizer";
import type { WorkflowContext } from "./types";

export async function runPlainInstall(
	ctx: WorkflowContext,
	input: {
		workflowId: string;
		packageManager: PackageManager;
		projectPath: string;
	},
) {
	const result = await ctx.commandRunner.runCommand({
		command: input.packageManager,
		args: ["install"],
		cwd: input.projectPath,
	});

	if (result.success) {
		return result;
	}

	if (input.packageManager === "npm") {
		ctx.emitProgress({
			workflowId: input.workflowId,
			status: "running",
			step: "dependency-auto-fix",
			message: summarizeAutoFix(input.packageManager),
		});

		return ctx.commandRunner.runCommand({
			command: input.packageManager,
			args: ["install", "--legacy-peer-deps"],
			cwd: input.projectPath,
		});
	}

	return result;
}

export async function installPackagesWithAutoFix(
	ctx: WorkflowContext,
	input: {
		workflowId: string;
		packageManager: PackageManager;
		projectPath: string;
		packages: string[];
		dev?: boolean;
	},
) {
	const args = getInstallCommand(input.packageManager, input.packages, { dev: input.dev });
	const result = await ctx.commandRunner.runCommand({
		command: input.packageManager,
		args,
		cwd: input.projectPath,
	});

	if (result.success) {
		return result;
	}

	const autoFixArgs = getAutoFixArgs(input.packageManager, input.packages, { dev: input.dev });

	if (!autoFixArgs) {
		return result;
	}

	ctx.emitProgress({
		workflowId: input.workflowId,
		status: "running",
		step: "dependency-auto-fix",
		message: summarizeAutoFix(input.packageManager),
	});

	return ctx.commandRunner.runCommand({
		command: input.packageManager,
		args: autoFixArgs,
		cwd: input.projectPath,
	});
}
