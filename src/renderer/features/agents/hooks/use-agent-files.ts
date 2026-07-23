import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { splitPath } from "../utils/paths";

/** A file the search turned up, flattened out of the tree. */
export interface AgentFileMatch {
  node: ImportedProjectIndexNode;
  /** Folder part of the path, for the second line of a result row. */
  directory: string;
}

/**
 * Scanning a project takes a moment, so trees are kept at module level: the
 * rail can be opened and closed, and projects switched, without rescanning.
 */
const treeAtom = atom<Record<string, ImportedProjectIndexNode[]>>({});

/** Depth-first walk yielding every file, folders excluded. */
function* walkFiles(nodes: ImportedProjectIndexNode[]): Generator<ImportedProjectIndexNode> {
  for (const node of nodes) {
    if (node.type === "folder") {
      yield* walkFiles(node.children);
      continue;
    }

    yield node;
  }
}

/** How many results the rail will show before it stops looking. */
const MAX_MATCHES = 200;

export function useAgentFiles(projectPath: string, isOpen: boolean) {
  const [trees, setTrees] = useAtom(treeAtom);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const tree = projectPath ? trees[projectPath] : undefined;

  const refresh = useCallback(async () => {
    if (!projectPath) return;

    setLoading(true);
    try {
      const result = await globalThis.lazify.importProjectIndexFromDirectory(projectPath);

      setTrees((previous) => ({ ...previous, [projectPath]: result.tree }));
    } catch {
      // An unreadable project just leaves the rail empty.
      setTrees((previous) => ({ ...previous, [projectPath]: [] }));
    } finally {
      setLoading(false);
    }
  }, [projectPath, setTrees]);

  // Scanned the first time the rail is opened for a project, not before.
  useEffect(() => {
    if (!isOpen || !projectPath || trees[projectPath]) return;

    void refresh();
  }, [isOpen, projectPath, refresh, trees]);

  // Searching by name is how you find a component you half-remember.
  const matches = useMemo<AgentFileMatch[]>(() => {
    const needle = query.trim().toLowerCase();

    if (!needle || !tree) return [];

    const found: AgentFileMatch[] = [];

    for (const node of walkFiles(tree)) {
      if (!node.relativePath.toLowerCase().includes(needle)) continue;

      found.push({ node, directory: splitPath(node.relativePath).directory });

      if (found.length >= MAX_MATCHES) break;
    }

    return found;
  }, [query, tree]);

  return {
    tree: tree ?? [],
    loading,
    query,
    setQuery,
    matches,
    searching: query.trim().length > 0,
    refresh
  };
}
