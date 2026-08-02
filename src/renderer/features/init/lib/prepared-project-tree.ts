import type {
  ImportedProjectIndexNode,
  ProjectTreeNode,
} from "@renderer/shared/types/lazify";

/**
 * Turns the tree Lazify just wrote to disk into the shape the structure editor
 * edits. Nothing is synthesized here — every node stands for a real file.
 *
 * `required` paths become locked, so the files a starter cannot build without
 * are not offered for removal in the first place. Main enforces the same list
 * again, because the UI is not where that rule can be trusted.
 */
export function toEditableTree(
  nodes: ImportedProjectIndexNode[],
  required: string[],
): ProjectTreeNode[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
    source: "cli" as const,
    locked: required.includes(node.relativePath),
    children: toEditableTree(node.children, required),
  }));
}

function collectIndexPaths(
  nodes: ImportedProjectIndexNode[],
  into: string[] = [],
): string[] {
  for (const node of nodes) {
    into.push(node.relativePath);
    collectIndexPaths(node.children, into);
  }
  return into;
}

function collectEditedPaths(
  nodes: ProjectTreeNode[],
  prefix = "",
  into = new Set<string>(),
): Set<string> {
  for (const node of nodes) {
    const nodePath = prefix ? `${prefix}/${node.name}` : node.name;
    into.add(nodePath);
    collectEditedPaths(node.children, nodePath, into);
  }
  return into;
}

/**
 * What the user took out: everything that was on disk after preparing but is
 * no longer in the tree they edited.
 *
 * A removed folder's children are dropped from the list, since deleting the
 * folder already takes them — sending both would be redundant, and the shorter
 * list is what the progress message counts.
 */
export function collectRemovedPaths(
  original: ImportedProjectIndexNode[],
  edited: ProjectTreeNode[],
): string[] {
  const keptPaths = collectEditedPaths(edited);
  const removed = collectIndexPaths(original).filter(
    (candidate) => !keptPaths.has(candidate),
  );

  return removed.filter(
    (candidate) =>
      !removed.some((other) => other !== candidate && candidate.startsWith(`${other}/`)),
  );
}
