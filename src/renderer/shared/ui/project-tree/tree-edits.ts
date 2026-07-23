import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";

/**
 * Pure tree edits shared by the adapters that let a user restructure a project:
 * both drive the same node shape, so the mutations belong in one place.
 */

/** Joins a child name onto its parent's path, tolerating a root-level parent. */
export function buildPath(parentPath: string, name: string) {
  return parentPath ? `${parentPath}/${name}` : name;
}

/** Replaces or removes one node by id, rebuilding only the branch it sits on. */
export function updateNodeTree(
  nodes: ImportedProjectIndexNode[],
  targetId: string,
  updater: (node: ImportedProjectIndexNode) => ImportedProjectIndexNode | null,
): ImportedProjectIndexNode[] {
  return nodes.flatMap((node) => {
    if (node.id === targetId) {
      const updated = updater(node);
      return updated ? [updated] : [];
    }

    if (node.children.length === 0) {
      return [node];
    }

    return [
      {
        ...node,
        children: updateNodeTree(node.children, targetId, updater),
      },
    ];
  });
}

/** Renames a node and rewrites the stored paths of everything beneath it. */
export function renameNodeWithPaths(
  node: ImportedProjectIndexNode,
  nextName: string,
): ImportedProjectIndexNode {
  const previousRelativePath = node.relativePath;
  const previousAbsolutePath = node.absolutePath;
  const relativeSegments = previousRelativePath.split("/");
  const absoluteSegments = previousAbsolutePath.split("/");
  relativeSegments[relativeSegments.length - 1] = nextName;
  absoluteSegments[absoluteSegments.length - 1] = nextName;
  const nextRelativePath = relativeSegments.join("/");
  const nextAbsolutePath = absoluteSegments.join("/");

  const rewriteChildren = (
    children: ImportedProjectIndexNode[],
  ): ImportedProjectIndexNode[] =>
    children.map((child) => ({
      ...child,
      relativePath: child.relativePath.replace(
        previousRelativePath,
        nextRelativePath,
      ),
      absolutePath: child.absolutePath.replace(
        previousAbsolutePath,
        nextAbsolutePath,
      ),
      children: rewriteChildren(child.children),
    }));

  return {
    ...node,
    name: nextName,
    relativePath: nextRelativePath,
    absolutePath: nextAbsolutePath,
    children: rewriteChildren(node.children),
  };
}
