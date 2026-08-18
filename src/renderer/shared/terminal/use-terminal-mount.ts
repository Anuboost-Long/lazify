import { useEffect, useLayoutEffect, useRef } from "react";

import { useResolvedTheme } from "@renderer/shared/hooks/use-theme";
import {
  acquire,
  attach,
  detach,
  focusTerminal,
  setTerminalTheme,
  type PooledTerminal,
} from "./terminal-pool";

export interface TerminalMountOptions {
  runId: string;

  /**
   * Share one terminal across every mount point showing this run. Opting out
   * builds a private instance, which parses the same stream a second time — the
   * only reason to want it is showing one run in two places at once.
   */
  shared?: boolean;

  active?: boolean;
  autoFocus?: boolean;

  onResolveFilePath?: (printedPath: string) => Promise<string | null>;
  onOpenFilePath?: (absolutePath: string, line: number | null) => void;
}

export function useTerminalMount({
  runId,
  shared = true,
  active,
  autoFocus,
  onResolveFilePath,
  onOpenFilePath,
}: TerminalMountOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pooledRef = useRef<PooledTerminal | null>(null);
  const resolvedTheme = useResolvedTheme();

  // Ahead of the mount below, so a terminal built during that layout pass is
  // built with the right palette rather than repainted a frame later.
  useLayoutEffect(() => setTerminalTheme(resolvedTheme), [resolvedTheme]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const pooled = acquire(runId, shared);
    pooledRef.current = pooled;
    attach(pooled, container);

    return () => {
      detach(pooled, container);
      pooledRef.current = null;
    };
  }, [runId, shared]);

  useEffect(() => {
    const pooled = pooledRef.current;
    if (!pooled) return;

    pooled.links.resolve = onResolveFilePath;
    pooled.links.open = onOpenFilePath;
  }, [onOpenFilePath, onResolveFilePath]);

  // Becoming the visible mount takes the terminal back, so a run that was
  // showing somewhere else follows the user to whichever view they are on.
  useEffect(() => {
    const pooled = pooledRef.current;
    const container = containerRef.current;
    if (!active || !pooled || !container) return;

    attach(pooled, container);

    if (!autoFocus) return;

    requestAnimationFrame(() => focusTerminal(pooled));
  }, [active, autoFocus, runId]);

  return containerRef;
}
