import { matchPackageVersions as match } from "@/shared/lib/package-version-matcher/version-matcher";
import type { VersionMatchReport } from "@/shared/lib/package-version-matcher/types";
import path from "@/shared/lib/path";
import * as packageWorkflows from "@/shared/lib/scaffolding/workflow/packages";
import type {
	AddProjectPackagePayload,
	InstallPackagePayload,
	RemoveProjectPackagePayload,
	WorkflowResult,
} from "@/shared/lib/scaffolding/workflow/types";
import type { InstalledPackage } from "@/shared/types/packages";

import { projectReader, readTextFile } from "./folders";
import { registryFetch } from "./registry";
import { workflow } from "./workflow";

export { getNpmAudit, getNpmOutdated } from "@/shared/lib/projects/project-health";
export { searchNpmPackages } from "@/shared/lib/scaffolding/npm-registry";

export function matchPackageVersions(projectPath: string): Promise<VersionMatchReport> {
	return match({ projectPath, project: projectReader(projectPath), registry: registryFetch });
}

export async function listProjectPackages(projectPath: string): Promise<InstalledPackage[]> {
	const text = await readTextFile(path.join(projectPath, "package.json"));
	if (text === null) return [];
	const raw = JSON.parse(text) as Record<string, unknown>;
	const deps = Object.entries((raw.dependencies ?? {}) as Record<string, string>).map(([name, versionSpec]) => ({ name, versionSpec, isDev: false }));
	const devDeps = Object.entries((raw.devDependencies ?? {}) as Record<string, string>).map(([name, versionSpec]) => ({ name, versionSpec, isDev: true }));
	return [...deps, ...devDeps];
}

export const installPackage = (payload: InstallPackagePayload) => packageWorkflows.installPackage(workflow, payload);

export const addProjectPackage = (payload: AddProjectPackagePayload) => packageWorkflows.addProjectPackage(workflow, payload);

export const removeProjectPackage = (payload: RemoveProjectPackagePayload) =>
	packageWorkflows.removeProjectPackage(workflow, payload);

export const installProjectDependencies = (projectPath: string) =>
	packageWorkflows.installProjectDependencies(workflow, projectPath);

export async function fixProjectPackageVersions(projectPath: string): Promise<WorkflowResult> {
	const report = await matchPackageVersions(projectPath);
	if (!report.installPlan.length) {
		return { success: true, message: "All packages are already compatible.", projectPath };
	}
	return installPackage({
		packageName: report.installPlan.join(","),
		baseDirectory: path.dirname(projectPath),
		projectName: path.basename(projectPath),
	});
}
