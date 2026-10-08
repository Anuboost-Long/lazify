import { desktop } from "@chain/sdk";
import type { ChainError } from "@chain/sdk";

import type { ProjectReader } from "@/shared/lib/stack-detection/project-reader";

const isNotFound = (error: unknown) => (error as Partial<ChainError> | null)?.code === "NOT_FOUND";

export function projectReader(root: string): ProjectReader {
	const absolute = (relativePath: string) => (relativePath ? `${root}/${relativePath}` : root);

	return {
		exists: (relativePath) => desktop.folders.exists(absolute(relativePath)),
		list: async (relativeDirectory) =>
			(await desktop.folders.list(absolute(relativeDirectory))).map((entry) => ({
				name: entry.name,
				isDirectory: entry.kind === "folder",
			})),
		readText: async (relativePath) => {
			try {
				return await desktop.folders.readText(absolute(relativePath));
			} catch (error) {
				if (isNotFound(error)) return null;
				throw error;
			}
		},
	};
}
