import { useEffect, useRef, useState } from "react";

import type { ProjectRequests, RequestStorage, SavedRequest } from "../types";

export function useSavedRequests(projectPath: string) {
  const stored = useRef<ProjectRequests>({});
  const [loadedAt, setLoadedAt] = useState(0);
  const [location, setLocation] = useState<RequestStorage | null>(null);
  const [asking, setAsking] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    stored.current = {};
    asked.current = false;
    setLoadedAt(0);
    setLocation(null);
    setAsking(false);

    if (!projectPath) return;

    let cancelled = false;

    void globalThis.lazify
      .readApiRequests(projectPath)
      .then((store) => {
        if (cancelled) return;

        stored.current = store.requests;
        setLocation(store.location);
        setLoadedAt(Date.now());
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  return {
    loadedAt,
    location,
    asking,
    saved: (routeId: string): SavedRequest | undefined => stored.current[routeId],
    persist: (routeId: string, request: SavedRequest) => {
      stored.current = { ...stored.current, [routeId]: request };

      if (!projectPath) return;

      if (!location && !asked.current) {
        asked.current = true;
        setAsking(true);
      }

      void globalThis.lazify.saveApiRequest(projectPath, routeId, request).catch(() => undefined);
    },
    forget: (routeId: string) => {
      const { [routeId]: dropped, ...rest } = stored.current;

      stored.current = rest;

      if (projectPath && dropped) {
        void globalThis.lazify.forgetApiRequest(projectPath, routeId).catch(() => undefined);
      }
    },
    choose: (next: RequestStorage) => {
      setAsking(false);
      setLocation(next);

      if (!projectPath) return;

      void globalThis.lazify
        .setApiRequestStorage(projectPath, next)
        .then((store) => {
          stored.current = store.requests;
        })
        .catch(() => undefined);
    },
    ask: () => setAsking(true),
    dismiss: () => setAsking(false)
  };
}
