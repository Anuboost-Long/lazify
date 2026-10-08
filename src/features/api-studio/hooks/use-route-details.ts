import { useEffect, useState } from "react";

import type { SavedRoute, SavedRouteSummary } from "../types";

/**
 * The open route, filled in from its folder's detail file.
 *
 * A collection lists from the index alone, so parameters, bodies and responses
 * arrive only for the folder a user actually opens, and stay for the session.
 */
export function useRouteDetails(
  projectPath: string,
  route: SavedRouteSummary | null,
  scannedAt: string | null
) {
  const [loadedFolders, setLoadedFolders] = useState<Record<string, SavedRoute[]>>({});

  useEffect(() => {
    setLoadedFolders({});
  }, [projectPath, scannedAt]);

  const folder = route?.folder ?? null;
  const loaded = folder ? loadedFolders[folder] : undefined;

  useEffect(() => {
    if (!projectPath || !folder || loaded) return;

    let cancelled = false;

    void globalThis.lazify
      .readRouteDetails(projectPath, folder)
      .then((details) => {
        if (cancelled) return;
        setLoadedFolders((current) => ({
          ...current,
          [folder]: details as unknown as SavedRoute[]
        }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [projectPath, folder, loaded]);

  if (!route) return null;

  const detail = loaded?.find((entry) => entry.id === route.id);

  return { ...route, ...detail } as SavedRoute;
}
