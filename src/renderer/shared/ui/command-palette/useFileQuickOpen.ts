import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FileSearchEngine,
  type FileSearchEntry,
  type FileSearchResult,
} from "@renderer/shared/lib/fuzzy/file-search";

export interface QuickOpenTreeNode {
  id: string;
  name: string;
  type: "file" | "folder";
  relativePath?: string;
  absolutePath?: string;
  children: readonly QuickOpenTreeNode[];
}

/** Most rows a human scans before retyping — also caps the sort cost. */
const RESULT_LIMIT = 50;

/** Depth-first walk collecting only files, the searchable leaves of the tree. */
function collectFiles(
  nodes: readonly QuickOpenTreeNode[],
  out: FileSearchEntry[],
  parentPath = "",
): void {
  for (const node of nodes) {
    const derivedPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.type === "file") {
      out.push({
        id: node.id,
        name: node.name,
        path: node.relativePath ?? derivedPath,
        absolutePath: node.absolutePath ?? derivedPath,
      });
    } else if (node.children.length > 0) {
      collectFiles(node.children, out, node.relativePath ?? derivedPath);
    }
  }
}

export interface FileQuickOpen {
  open: boolean;
  query: string;
  results: FileSearchResult[];
  setQuery: (query: string) => void;
  openPalette: () => void;
  close: () => void;
  select: (entry: FileSearchEntry) => void;
}

/**
 * Wires Cmd/Ctrl+P to a file quick-open over `tree`. The search index is built
 * once per tree and reused across keystrokes; results are recomputed only while
 * the palette is open. Shift/Alt are left free so a command palette can claim
 * Cmd/Ctrl+Shift+P later without fighting this.
 */
export function useFileQuickOpen(
  tree: readonly QuickOpenTreeNode[],
  onOpenFile: (entry: FileSearchEntry) => void,
): FileQuickOpen {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const engineRef = useRef<FileSearchEngine | null>(null);
  if (engineRef.current === null) engineRef.current = new FileSearchEngine();
  const engine = engineRef.current;

  // Rebuild the index when the tree changes; the version bump re-runs search.
  const [indexVersion, setIndexVersion] = useState(0);
  useEffect(() => {
    const entries: FileSearchEntry[] = [];
    collectFiles(tree, entries);
    engine.setEntries(entries);
    setIndexVersion((current) => current + 1);
  }, [engine, tree]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setQuery("");
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const results = useMemo(
    () => (open ? engine.search(query, RESULT_LIMIT) : []),
    // indexVersion stands in for the mutable engine's contents.
    [open, query, engine, indexVersion],
  );

  const openPalette = useCallback(() => {
    setQuery("");
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const select = useCallback(
    (entry: FileSearchEntry) => {
      onOpenFile(entry);
      setOpen(false);
    },
    [onOpenFile],
  );

  return { open, query, results, setQuery, openPalette, close, select };
}
