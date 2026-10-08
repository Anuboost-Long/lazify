export { getFileDiff, getWorkingChanges } from "@/shared/lib/git/agent-changes";
export {
	commitChanges,
	discardChanges,
	pullCurrentBranch as pullBranch,
	pushCurrentBranch as pushBranch,
	stageFiles,
	unstageFiles,
} from "@/shared/lib/git/git-actions";
export type { GitActionResult } from "@/shared/lib/git/git-actions";
export {
	checkoutProjectBranch as checkoutBranch,
	getProjectGitStatus,
} from "@/shared/lib/git/project-git-status";
export type { GitCheckoutResult } from "@/shared/lib/git/project-git-status";
