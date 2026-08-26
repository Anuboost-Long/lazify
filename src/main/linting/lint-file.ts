import { ENGINES, projectRootFor } from "./engines";
import type { LintResult } from "./types";

export async function lintFile(filePath: string, content: string): Promise<LintResult> {
	const projectPath = projectRootFor(filePath);

	const settled = await Promise.all(
		ENGINES.map(async (engine) => {
			try {
				return await engine.run({ filePath, content, projectPath });
			} catch {
				return null;
			}
		}),
	);

	return {
		path: filePath,
		diagnostics: settled.flatMap((result) => result?.diagnostics ?? []),
	};
}
