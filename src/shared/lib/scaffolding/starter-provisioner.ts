export type StarterFailureReason = "git-missing" | "offline" | "unreachable" | "clone-failed";

export interface ProvisionStarterOptions {
  /** `owner/name` on GitHub. */
  repo: string;
  /** A tag, never a branch: a push to the starter must not change what an existing pin produces. */
  ref: string;
  /** Where the project is being created. The clone lands here directly. */
  projectPath: string;
  projectName: string;
}
