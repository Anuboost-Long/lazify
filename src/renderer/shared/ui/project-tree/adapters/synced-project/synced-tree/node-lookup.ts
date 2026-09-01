import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";

export function buildAncestorIds(
	tree: ImportedProjectIndexNode[],
	targetId: string,
	trail: string[] = [],
): string[] {
	for (const node of tree) {
		const nextTrail = [...trail, node.id];

		if (node.id === targetId) {
			return trail;
		}

		if (node.children.length > 0) {
			const nested = buildAncestorIds(node.children, targetId, nextTrail);

			if (nested.length > 0) {
				return nested;
			}
		}
	}

	return [];
}

export interface RevealTarget {
	/** Relative to the project, as a scanner or a link states it. */
	filePath: string;
	line: number | null;
}

export function findNodeByRelativePath(
	tree: ImportedProjectIndexNode[],
	relativePath: string,
): ImportedProjectIndexNode | null {
	const wanted = relativePath.replace(/\\/g, "/").replace(/^\.?\//, "");

	const visit = (nodes: ImportedProjectIndexNode[]): ImportedProjectIndexNode | null => {
		for (const node of nodes) {
			if (node.relativePath.replace(/\\/g, "/") === wanted) return node;

			const nested = visit(node.children);
			if (nested) return nested;
		}

		return null;
	};

	return visit(tree);
}

export function findNodeByAbsolutePath(
	tree: ImportedProjectIndexNode[],
	absolutePath: string,
): ImportedProjectIndexNode | null {
	const visit = (nodes: ImportedProjectIndexNode[]): ImportedProjectIndexNode | null => {
		for (const node of nodes) {
			if (node.absolutePath === absolutePath) {
				return node;
			}

			const nested = visit(node.children);

			if (nested) {
				return nested;
			}
		}

		return null;
	};

	return visit(tree);
}
