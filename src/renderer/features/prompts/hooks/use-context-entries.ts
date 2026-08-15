import { useCallback, useEffect, useState } from "react";

import type { ContextEntry, ContextEntryInput, ContextScope } from "@main/prompts/types";

/** A project's context and the global entries that apply to it. */
export function useContextEntries(projectPath: string) {
  const [entries, setEntries] = useState<ContextEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Asked for even with no project: the global entries hold regardless, and a
  // page that showed nothing until a project was picked hid half the feature.
  const refresh = useCallback(async () => {
    setEntries(await globalThis.lazify.listContextEntries(projectPath));
    setLoading(false);
  }, [projectPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: ContextEntryInput) => {
      await globalThis.lazify.createContextEntry(input);
      await refresh();
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, input: ContextEntryInput) => {
      await globalThis.lazify.updateContextEntry(id, input);
      await refresh();
    },
    [refresh]
  );

  // Switched here as well as in the store, so the row answers the click at once.
  const setActive = useCallback(async (id: string, isActive: boolean) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, isActive } : entry))
    );
    await globalThis.lazify.setContextEntryActive(id, isActive);
  }, []);

  const setPackActive = useCallback(
    async (scope: ContextScope, scopeKey: string, pack: string, isActive: boolean) => {
      setEntries((current) =>
        current.map((entry) =>
          entry.scope === scope && entry.scopeKey === scopeKey && entry.pack === pack
            ? { ...entry, isActive }
            : entry
        )
      );
      await globalThis.lazify.setContextPackActive(scope, scopeKey, pack, isActive);
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      await globalThis.lazify.deleteContextEntry(id);
      await refresh();
    },
    [refresh]
  );

  return { entries, loading, refresh, create, update, setActive, setPackActive, remove };
}
