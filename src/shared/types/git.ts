export interface GitStatusEntry {
	path: string;
	absolutePath: string;
	stagedStatus: string;
	unstagedStatus: string;
	statusLabel: string;
}

export interface ProjectGitStatusResult {
	projectPath: string;
	repoRoot: string | null;
	remoteUrl: string | null;
	branch: string | null;
	branches: string[];
	isGitRepo: boolean;
	hasUncommittedChanges: boolean;
	entries: GitStatusEntry[];
}

/** One working-tree file plus its line counts, used by the agent changes panel. */
export interface AgentFileChange {
	path: string;
	absolutePath: string;
	statusLabel: string;
	untracked: boolean;
	additions: number;
	deletions: number;
}

/**
 * One assignment in a .env file.
 *
 * `line` is the 0-based line it occupies, and is how an edit addresses it —
 * paired with the key, so an edit aimed at a file that has since changed is
 * rejected rather than applied to the wrong row.
 */
