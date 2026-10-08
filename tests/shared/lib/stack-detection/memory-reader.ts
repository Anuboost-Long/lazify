import type { ProjectEntry, ProjectReader } from "@/shared/lib/stack-detection/project-reader";

import type { ProjectTree } from "./stack-detection.cases";

export function memoryReader(tree: ProjectTree): ProjectReader {
	const paths = Object.keys(tree);
	const isDirectory = (path: string) =>
		path === "" || paths.some((key) => key.startsWith(`${path}/`));

	return {
		exists: async (path) => path in tree || isDirectory(path),
		list: async (directory) => {
			if (!isDirectory(directory)) throw new Error(`ENOENT: ${directory}`);

			const prefix = directory ? `${directory}/` : "";
			const entries = new Map<string, ProjectEntry>();

			for (const key of paths) {
				if (!key.startsWith(prefix)) continue;

				const [name, ...rest] = key.slice(prefix.length).split("/");
				if (name) entries.set(name, { name, isDirectory: rest.length > 0 });
			}

			return [...entries.values()].sort((left, right) => (left.name < right.name ? -1 : 1));
		},
		readText: async (path) => {
			if (isDirectory(path)) throw new Error(`EISDIR: ${path}`);

			return tree[path] ?? null;
		},
	};
}
