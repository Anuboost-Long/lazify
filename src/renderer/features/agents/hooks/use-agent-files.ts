import { atom, useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";
import { splitPath } from "../utils/paths";

export interface AgentFileMatch {
  node: ImportedProjectIndexNode;

  directory: string;
}

const treeAtom = atom<Record<string, ImportedProjectIndexNode[]>>({});

function* walkFiles(nodes: ImportedProjectIndexNode[]): Generator<ImportedProjectIndexNode> {
  for (const node of nodes) {
    if (node.type === "folder") {
      yield* walkFiles(node.children);
      continue;
    }

    yield node;
  }
}

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
      setTrees((previous) => ({ ...previous, [projectPath]: [] }));
    } finally {
      setLoading(false);
    }
  }, [projectPath, setTrees]);

  useEffect(() => {
    if (!isOpen || !projectPath || trees[projectPath]) return;

    void refresh();
  }, [isOpen, projectPath, refresh, trees]);

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
