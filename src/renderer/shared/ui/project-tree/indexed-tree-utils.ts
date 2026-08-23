import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";

export function countFiles(nodes: ImportedProjectIndexNode[]): number {
  return nodes.reduce(
    (total, node) =>
      total + (node.type === "file" ? 1 : 0) + countFiles(node.children),
    0,
  );
}

export function findNodeById(
  nodes: ImportedProjectIndexNode[],
  id: string,
): ImportedProjectIndexNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const nested = findNodeById(node.children, id);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function collectDescendantFilePaths(
  node: ImportedProjectIndexNode,
): string[] {
  if (node.type === "file") {
    return [node.relativePath];
  }

  return node.children.flatMap((child) => collectDescendantFilePaths(child));
}

export function hasIncludedFiles(
  node: ImportedProjectIndexNode,
  includedFilePaths: Set<string>,
) {
  return collectDescendantFilePaths(node).some((filePath) =>
    includedFilePaths.has(filePath),
  );
}
