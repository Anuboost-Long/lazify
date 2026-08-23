import { useCallback, useEffect, useRef, useState } from "react";

import type { SavedRouteScan } from "../types";

export function useRouteScan(projectPath: string) {
  const [saved, setSaved] = useState<SavedRouteScan | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openProjectPath = useRef(projectPath);

  useEffect(() => {
    openProjectPath.current = projectPath;
    setSaved(null);
    setError(null);

    if (!projectPath) return;

    setLoading(true);
    void globalThis.lazify
      .readProjectRoutes(projectPath)
      .then((stored) => {
        if (openProjectPath.current === projectPath) setSaved(stored);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [projectPath]);

  const scan = useCallback(async () => {
    if (!projectPath) return;

    setScanning(true);
    setError(null);

    try {
      const scanned = await globalThis.lazify.scanProjectRoutes(projectPath);
      if (openProjectPath.current === projectPath) setSaved(scanned);
    } catch (cause) {
      if (openProjectPath.current === projectPath) {
        setSaved(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    } finally {
      setScanning(false);
    }
  }, [projectPath]);

  return { saved, loading, scanning, error, scan };
}
