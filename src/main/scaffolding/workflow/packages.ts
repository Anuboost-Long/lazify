import fs from "node:fs";
import path from "node:path";

import { choosePackageManager, scanEnvironment } from "../../environment/scanner";
import { getUninstallCommand } from "../harmonizer";
import { installPackagesWithAutoFix, runPlainInstall } from "./installers";
import { resolveUserPath } from "./paths";
import type {
	AddProjectPackagePayload,
	InstallPackagePayload,
	RemoveProjectPackagePayload,
	WorkflowContext,
	WorkflowResult,
} from "./types";

export async function installPackage(
	ctx: WorkflowContext,
	payload: InstallPackagePayload,
): Promise<WorkflowResult> {
	const workflowId = `install-${Date.now()}`;
	const environment = scanEnvironment();

	if (environment.issues.length > 0) {
		throw new Error(environment.issues.join(" "));
	}

	const projectPath = path.resolve(resolveUserPath(payload.baseDirectory), payload.projectName);
	const packageManager = choosePackageManager(projectPath);

	if (!fs.existsSync(projectPath)) {
		throw new Error(`Project path does not exist: ${projectPath}`);
	}

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "install-package",
		message: `Installing ${payload.packageName} with ${packageManager}.`,
	});

	const result = await installPackagesWithAutoFix(ctx, {
		workflowId,
		packageManager,
		projectPath,
		packages: payload.packageName
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean),
	});

	if (!result.success) {
		ctx.emitProgress({
			workflowId,
			status: "error",
			step: "install-package",
			message: "Package installation failed.",
		});

		return {
			success: false,
			message: "Package installation failed.",
		};
	}

	ctx.emitProgress({
		workflowId,
		status: "success",
		step: "complete",
		message: "Packages installed successfully.",
	});

	return {
		success: true,
		message: "Packages installed successfully.",
		projectPath,
	};
}

export async function addProjectPackage(
	ctx: WorkflowContext,
	payload: AddProjectPackagePayload,
): Promise<WorkflowResult> {
	const workflowId = `add-pkg-${Date.now()}`;

	if (!fs.existsSync(payload.projectPath)) {
		throw new Error(`Project path does not exist: ${payload.projectPath}`);
	}

	const packageManager = choosePackageManager(payload.projectPath);

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "add-package",
		message: `Installing ${payload.packageName} with ${packageManager}.`,
	});

	const result = await installPackagesWithAutoFix(ctx, {
		workflowId,
		packageManager,
		projectPath: payload.projectPath,
		packages: [payload.packageName],
		dev: payload.dev,
	});

	if (!result.success) {
		ctx.emitProgress({
			workflowId,
			status: "error",
			step: "add-package",
			message: "Package installation failed.",
		});
		return { success: false, message: "Package installation failed." };
	}

	ctx.emitProgress({
		workflowId,
		status: "success",
		step: "complete",
		message: `${payload.packageName} installed successfully.`,
	});

	return {
		success: true,
		message: `${payload.packageName} installed successfully.`,
		projectPath: payload.projectPath,
	};
}

export async function installProjectDependencies(
	ctx: WorkflowContext,
	projectPath: string,
): Promise<WorkflowResult> {
	const workflowId = `install-deps-${Date.now()}`;

	if (!fs.existsSync(projectPath)) {
		throw new Error(`Project path does not exist: ${projectPath}`);
	}

	const packageManager = choosePackageManager(projectPath);

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "install-dependencies",
		message: `Installing dependencies with ${packageManager}.`,
	});

	const result = await runPlainInstall(ctx, { workflowId, packageManager, projectPath });

	if (!result.success) {
		ctx.emitProgress({
			workflowId,
			status: "error",
			step: "install-dependencies",
			message: "Dependency installation failed.",
		});
		return { success: false, message: "Dependency installation failed." };
	}

	ctx.emitProgress({
		workflowId,
		status: "success",
		step: "complete",
		message: "Dependencies installed successfully.",
	});

	return { success: true, message: "Dependencies installed successfully.", projectPath };
}

export async function removeProjectPackage(
	ctx: WorkflowContext,
	payload: RemoveProjectPackagePayload,
): Promise<WorkflowResult> {
	const workflowId = `remove-pkg-${Date.now()}`;

	if (!fs.existsSync(payload.projectPath)) {
		throw new Error(`Project path does not exist: ${payload.projectPath}`);
	}

	const packageManager = choosePackageManager(payload.projectPath);

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "remove-package",
		message: `Removing ${payload.packageName} with ${packageManager}.`,
	});

	const args = getUninstallCommand(packageManager, payload.packageName);
	const result = await ctx.commandRunner.runCommand({
		command: packageManager,
		args,
		cwd: payload.projectPath,
	});

	if (!result.success) {
		ctx.emitProgress({
			workflowId,
			status: "error",
			step: "remove-package",
			message: "Package removal failed.",
		});
		return { success: false, message: "Package removal failed." };
	}

	ctx.emitProgress({
		workflowId,
		status: "success",
		step: "complete",
		message: `${payload.packageName} removed successfully.`,
	});

	return {
		success: true,
		message: `${payload.packageName} removed successfully.`,
		projectPath: payload.projectPath,
	};
}
