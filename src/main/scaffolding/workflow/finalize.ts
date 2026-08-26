import fsPromises from "node:fs/promises";
import path from "node:path";

import { choosePackageManager } from "../../environment/scanner";
import { getTemplate } from "../harmonizer";
import { forgetPreparedProject, getPreparedProject } from "../prepared-projects";
import type { PreparedProject } from "../prepared-projects";
import {
	buildTemplatePackageInstallPlan,
	loadTemplatePackageManifest,
	readProjectPackageJson,
	resolveManifestToLatest,
} from "../template-package-manifest";
import { installPackagesWithAutoFix } from "./installers";
import { resolveInsideProject } from "./paths";
import { materializePrepared } from "./prepare";
import type { FinalizeProjectPayload, WorkflowContext, WorkflowResult } from "./types";

/**
 * Step two of two: what the user chose in the picker, then install, then a
 * repository. Everything here used to run straight after creation, before
 * anyone could look at the tree.
 */
export async function finalizeProject(
	ctx: WorkflowContext,
	payload: FinalizeProjectPayload,
): Promise<WorkflowResult> {
	const workflowId = `finalize-${Date.now()}`;
	const prepared = getPreparedProject(payload.projectPath);

	if (!prepared) {
		throw new Error("That project is no longer waiting to be finished.");
	}

	const { projectPath } = prepared;
	const template = getTemplate(prepared.templateId);

	await applyPickerChoices(ctx, payload, prepared, workflowId);

	// Tier 1 finishes differently: a starter is a working app, so there is no
	// structure to reconcile and no manifest to apply — its own package.json is
	// the dependency list, and overlaying a synthesized tree here would
	// reintroduce exactly the drift the starter repos exist to remove.
	if (template.starter) {
		return finalizeStarterProject(ctx, prepared, workflowId);
	}

	if (template.postInstallDependencies?.length) {
		ctx.emitProgress({
			workflowId,
			status: "running",
			step: "install-template-dependencies",
			message: "Installing template dependencies.",
		});

		const dependencyResult = await installPackagesWithAutoFix(ctx, {
			workflowId,
			packageManager: choosePackageManager(projectPath),
			projectPath,
			packages: template.postInstallDependencies,
		});

		if (!dependencyResult.success) {
			ctx.emitProgress({
				workflowId,
				status: "error",
				step: "install-template-dependencies",
				message: "Project preparation succeeded, but template dependency installation failed.",
			});

			return {
				success: false,
				message: "Project preparation succeeded, but template dependency installation failed.",
				projectPath,
			};
		}
	}

	// The structure the user chose was applied to the real tree in
	// applyPickerChoices. Nothing synthesized is overlaid here any more.

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "resolve-package-versions",
		message: "Resolving latest compatible package versions from npm.",
	});

	const rawManifest = loadTemplatePackageManifest(template);
	const projectPackageJson = readProjectPackageJson(projectPath);
	const packageManifest = await resolveManifestToLatest(rawManifest, {
		...projectPackageJson.dependencies,
		...projectPackageJson.devDependencies,
	});
	const packagePlan = buildTemplatePackageInstallPlan(packageManifest, projectPackageJson);

	if (packagePlan.versionMismatches.length > 0) {
		ctx.emitProgress({
			workflowId,
			status: "running",
			step: "package-version-check",
			message: `Detected ${String(packagePlan.versionMismatches.length)} package version mismatch(es). Leaving existing versions unchanged for now.`,
		});
	}

	if (packagePlan.dependencies.length > 0) {
		ctx.emitProgress({
			workflowId,
			status: "running",
			step: "install-manifest-dependencies",
			message: `Installing ${String(packagePlan.dependencies.length)} missing dependency package(s).`,
		});

		const dependencyResult = await installPackagesWithAutoFix(ctx, {
			workflowId,
			packageManager: choosePackageManager(projectPath),
			projectPath,
			packages: packagePlan.dependencies,
			dev: false,
		});

		if (!dependencyResult.success) {
			ctx.emitProgress({
				workflowId,
				status: "error",
				step: "install-manifest-dependencies",
				message: "Project preparation succeeded, but runtime dependency installation failed.",
			});

			return {
				success: false,
				message: "Project preparation succeeded, but runtime dependency installation failed.",
				projectPath,
			};
		}
	}

	if (packagePlan.devDependencies.length > 0) {
		ctx.emitProgress({
			workflowId,
			status: "running",
			step: "install-manifest-dev-dependencies",
			message: `Installing ${String(packagePlan.devDependencies.length)} missing dev dependency package(s).`,
		});

		const devDependencyResult = await installPackagesWithAutoFix(ctx, {
			workflowId,
			packageManager: choosePackageManager(projectPath),
			projectPath,
			packages: packagePlan.devDependencies,
			dev: true,
		});

		if (!devDependencyResult.success) {
			ctx.emitProgress({
				workflowId,
				status: "error",
				step: "install-manifest-dev-dependencies",
				message: "Project preparation succeeded, but dev dependency installation failed.",
			});

			return {
				success: false,
				message: "Project preparation succeeded, but dev dependency installation failed.",
				projectPath,
			};
		}
	}

	await materializePrepared(ctx, prepared);
	forgetPreparedProject(payload.projectPath);

	ctx.emitProgress({
		workflowId,
		status: "success",
		step: "complete",
		message: `Project created successfully at ${prepared.destinationPath}.`,
	});

	return {
		success: true,
		message: `Project created successfully at ${prepared.destinationPath}.`,
		projectPath: prepared.destinationPath,
	};
}

/**
 * Removes what the user unticked and creates the optional folders they asked
 * for. `required` is enforced here rather than only in the UI, because a
 * starter is verified green by CI as a whole and these are the files without
 * which it cannot build.
 */

/**
 * Removes what the user unticked and creates the optional folders they asked
 * for. `required` is enforced here rather than only in the UI, because a
 * starter is verified green by CI as a whole and these are the files without
 * which it cannot build.
 */
export async function applyPickerChoices(
	ctx: WorkflowContext,
	payload: FinalizeProjectPayload,
	prepared: PreparedProject,
	workflowId: string,
): Promise<void> {
	const removals = (payload.removePaths ?? []).filter(
		(relativePath) => !prepared.required.includes(relativePath),
	);

	if (removals.length > 0) {
		ctx.emitProgress({
			workflowId,
			status: "running",
			step: "apply-structure",
			message: `Removing ${String(removals.length)} file(s) you unticked.`,
		});

		for (const relativePath of removals) {
			await fsPromises.rm(resolveInsideProject(prepared.projectPath, relativePath), {
				recursive: true,
				force: true,
			});
		}
	}

	for (const relativePath of payload.optionalFolderPaths ?? []) {
		const folderPath = resolveInsideProject(prepared.projectPath, relativePath);
		await fsPromises.mkdir(folderPath, { recursive: true });
		// A .gitkeep so an empty folder the user asked for survives the commit.
		await fsPromises.writeFile(path.join(folderPath, ".gitkeep"), "");
	}
}

/** Tier 1 finish: install what the starter declares, then make it a repository. */

/** Tier 1 finish: install what the starter declares, then make it a repository. */
export async function finalizeStarterProject(
	ctx: WorkflowContext,
	prepared: PreparedProject,
	workflowId: string,
): Promise<WorkflowResult> {
	const { projectPath } = prepared;

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "install-dependencies",
		message: "Installing the starter's dependencies.",
	});

	const installResult = await ctx.commandRunner.runCommand({
		command: choosePackageManager(projectPath),
		args: ["install"],
		cwd: projectPath,
	});

	if (!installResult.success) {
		ctx.emitProgress({
			workflowId,
			status: "error",
			step: "install-dependencies",
			message: "Project preparation succeeded, but dependency installation failed.",
		});

		return {
			success: false,
			message: "Project preparation succeeded, but dependency installation failed.",
			projectPath,
		};
	}

	// The starter's history was dropped during provisioning, so without this the
	// project has no repository at all — worse than what the CLI tier produces.
	await initializeRepository(ctx, projectPath, workflowId);

	await materializePrepared(ctx, prepared);
	forgetPreparedProject(projectPath);

	const message = `Project created successfully at ${prepared.destinationPath}.`;
	ctx.emitProgress({ workflowId, status: "success", step: "complete", message });

	return { success: true, message, projectPath: prepared.destinationPath };
}

/**
 * Backs out a prepared project by removing only Lazify's temporary staging
 * directory. The selected workspace has not been touched yet.
 */

/**
 * Best effort: a project that exists but is not a git repo is still usable,
 * so nothing here may turn a created project into a failed one. runCommand
 * rejects rather than resolving when a binary cannot be spawned, so the whole
 * sequence is wrapped rather than only its exit codes checked.
 */
export async function initializeRepository(
	ctx: WorkflowContext,
	projectPath: string,
	workflowId: string,
): Promise<void> {
	const steps = [
		["init", "--quiet"],
		["add", "-A"],
		["commit", "--quiet", "-m", "Initial commit"],
	];

	try {
		for (const args of steps) {
			const result = await ctx.commandRunner.runCommand({ command: "git", args, cwd: projectPath });

			if (!result.success) {
				break;
			}

			if (args === steps[steps.length - 1]) {
				return;
			}
		}
	} catch {
		// Falls through to the same notice as a non-zero exit.
	}

	ctx.emitProgress({
		workflowId,
		status: "running",
		step: "git-init",
		message: "Project created, but the git repository could not be initialized.",
	});
}
