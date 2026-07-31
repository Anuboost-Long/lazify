import type { GitStatusEntry } from "@renderer/shared/types/lazify";

/**
 * Turns git's flat list of changed paths into a folder tree.
 *
 * Chains of single-child folders are compacted into one row ("src/renderer/ui"
 * rather than three nested rows), which is what keeps a deep change set
 * readable in a narrow sidebar — the same thing VS Code does.
 */

export interface GitTreeNode {
  /** Repo-relative path; unique, so it doubles as the row key. */
  id: string;
  name: string;
  type: "file" | "folder";
  /** Set on files only. */
  entry?: GitStatusEntry;
  children: GitTreeNode[];
}

interface MutableNode extends GitTreeNode {
  childMap: Map<string, MutableNode>;
}

function makeFolder(id: string, name: string): MutableNode {
  return { id, name, type: "folder", children: [], childMap: new Map() };
}

/** Depth-first sort: folders before files, each alphabetical. */
function sortNodes(nodes: GitTreeNode[]): GitTreeNode[] {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;

    return a.name.localeCompare(b.name);
  });

  for (const node of nodes) {
    if (node.children.length > 0) sortNodes(node.children);
  }

  return nodes;
}

/** Folds `a` → `b` → `c` into a single `a/b/c` row. */
function compact(nodes: GitTreeNode[]): GitTreeNode[] {
  return nodes.map((node) => {
    if (node.type !== "folder") return node;

    let current = node;

    while (current.children.length === 1 && current.children[0].type === "folder") {
      const only = current.children[0];
      current = {
        ...only,
        name: `${current.name}/${only.name}`
      };
    }

    return { ...current, children: compact(current.children) };
  });
}

export function buildGitTree(entries: GitStatusEntry[]): GitTreeNode[] {
  const root = makeFolder("", "");

  for (const entry of entries) {
    const segments = entry.path.split("/").filter(Boolean);
    let cursor = root;

    segments.forEach((segment, index) => {
      const isLeaf = index === segments.length - 1;
      const id = segments.slice(0, index + 1).join("/");

      if (isLeaf) {
        cursor.children.push({ id, name: segment, type: "file", entry, children: [] });
        return;
      }

      let next = cursor.childMap.get(id);

      if (!next) {
        next = makeFolder(id, segment);
        cursor.childMap.set(id, next);
        cursor.children.push(next);
      }

      cursor = next;
    });
  }

  return compact(sortNodes(root.children));
}

/** Every folder id in the tree, for expanding all by default. */
export function collectFolderIds(nodes: GitTreeNode[]): string[] {
  return nodes.flatMap((node) =>
    node.type === "folder" ? [node.id, ...collectFolderIds(node.children)] : []
  );
}
