import { useEffect, useState } from "react";

export interface GitSummary {
	isGitRepo: boolean;
	branch: string | null;
	changedFiles: number;
}

/** The active project's branch and changed-file count, asked again whenever the app regains focus. */
export function useGitSummary(projectPath: string | null, enabled: boolean) {
	const [summary, setSummary] = useState<GitSummary | null>(null);

	useEffect(() => {
		if (!projectPath || !enabled) {
			setSummary(null);
			return;
		}

		let current = true;

		const refresh = async () => {
			try {
				const status = await globalThis.lazify.getProjectGitStatus(projectPath);
				if (!current) return;

				setSummary({
					isGitRepo: status.isGitRepo,
					branch: status.branch,
					changedFiles: status.entries.length,
				});
			} catch {
				if (current) setSummary(null);
			}
		};

		void refresh();
		globalThis.addEventListener("focus", refresh);

		return () => {
			current = false;
			globalThis.removeEventListener("focus", refresh);
		};
	}, [projectPath, enabled]);

	return summary;
}
