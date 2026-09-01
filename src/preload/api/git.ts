import { ipcRenderer } from "electron";

import type { GitActionResult } from "../../main/projects/git-actions";
import type { GitCheckoutResult } from "../../main/projects/project-git-status";
import type { AgentFileChange, ProjectGitStatusResult } from "../../renderer/shared/types/lazify";
export const gitApi = {
	getProjectGitStatus: (projectPath: string): Promise<ProjectGitStatusResult> =>
		ipcRenderer.invoke("lazify:project-git-status", projectPath),
	getWorkingChanges: (projectPath: string): Promise<AgentFileChange[]> =>
		ipcRenderer.invoke("lazify:working-changes", projectPath),
	getFileDiff: (projectPath: string, filePath: string, fullFile?: boolean): Promise<string> =>
		ipcRenderer.invoke("lazify:file-diff", projectPath, filePath, fullFile),
	checkoutBranch: (projectPath: string, branch: string): Promise<GitCheckoutResult> =>
		ipcRenderer.invoke("lazify:checkout-branch", projectPath, branch),
	stageFiles: (projectPath: string, paths: string[]): Promise<GitActionResult> =>
		ipcRenderer.invoke("lazify:stage-files", projectPath, paths),
	unstageFiles: (projectPath: string, paths: string[]): Promise<GitActionResult> =>
		ipcRenderer.invoke("lazify:unstage-files", projectPath, paths),
	discardChanges: (projectPath: string, paths: string[]): Promise<GitActionResult> =>
		ipcRenderer.invoke("lazify:discard-changes", projectPath, paths),
	commitChanges: (projectPath: string, message: string): Promise<GitActionResult> =>
		ipcRenderer.invoke("lazify:commit-changes", projectPath, message),
	pushBranch: (projectPath: string): Promise<GitActionResult> =>
		ipcRenderer.invoke("lazify:push-branch", projectPath),
	pullBranch: (projectPath: string): Promise<GitActionResult> =>
		ipcRenderer.invoke("lazify:pull-branch", projectPath),
	/**
	 * Where a dropped file actually lives on disk.
	 *
	 * `File.path` used to carry this and was removed from Electron; this is its
	 * replacement, and it only works from here — the renderer has no way to ask.
	 */
};
