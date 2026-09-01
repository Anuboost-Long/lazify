import { ipcRenderer } from "electron";

import type { VersionMatchReport } from "../../brain/package-version-matcher";
import type { NpmPackageSearchResult } from "../../main/scaffolding/npm-registry";
import type {
	AddProjectPackagePayload,
	RemoveProjectPackagePayload,
	WorkflowResult,
} from "../../main/scaffolding/workflow-engine";
import type {
	InstalledPackage,
	NpmAuditResult,
	NpmOutdatedResult,
} from "../../renderer/shared/types/lazify";
export const packagesApi = {
	searchNpmPackages: (query: string): Promise<NpmPackageSearchResult[]> =>
		ipcRenderer.invoke("lazify:search-npm-packages", query),
	getNpmOutdated: (projectPath: string): Promise<NpmOutdatedResult> =>
		ipcRenderer.invoke("lazify:npm-outdated", projectPath),
	getNpmAudit: (projectPath: string): Promise<NpmAuditResult> =>
		ipcRenderer.invoke("lazify:npm-audit", projectPath),
	listProjectPackages: (projectPath: string): Promise<InstalledPackage[]> =>
		ipcRenderer.invoke("lazify:list-project-packages", projectPath),
	addProjectPackage: (payload: AddProjectPackagePayload): Promise<WorkflowResult> =>
		ipcRenderer.invoke("lazify:add-project-package", payload),
	removeProjectPackage: (payload: RemoveProjectPackagePayload): Promise<WorkflowResult> =>
		ipcRenderer.invoke("lazify:remove-project-package", payload),
	installProjectDependencies: (projectPath: string): Promise<WorkflowResult> =>
		ipcRenderer.invoke("lazify:install-project-dependencies", projectPath),
	matchPackageVersions: (projectPath: string): Promise<VersionMatchReport> =>
		ipcRenderer.invoke("lazify:match-package-versions", projectPath),
	fixProjectPackageVersions: (
		projectPath: string,
	): Promise<import("../../main/scaffolding/workflow-engine").WorkflowResult> =>
		ipcRenderer.invoke("lazify:fix-project-package-versions", projectPath),
};
