import { useEffect, useRef, useState } from "react";

import type { CollectionDoc, DocGap, DocState } from "@main/api-studio/docs/types";

const SAVE_DELAY_MS = 700;

export function useCollectionDoc(projectPath: string, collectionId: string | null) {
  const [state, setState] = useState<DocState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const pending = useRef<CollectionDoc | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = (doc: CollectionDoc) => {
    if (!projectPath) return;

    pending.current = null;
    setSaving(true);

    void globalThis.lazify
      .saveCollectionDoc(projectPath, doc)
      .then((next) => {
        if (next) setState(next);
        setSavedAt(Date.now());
      })
      .catch(() => undefined)
      .finally(() => setSaving(false));
  };

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);

    timer.current = null;

    if (pending.current) send(pending.current);
  };

  const load = () => {
    if (!projectPath || !collectionId) return;

    setLoading(true);
    void globalThis.lazify
      .readCollectionDoc(projectPath, collectionId)
      .then((next) => setState(next))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setState(null);
    setSavedAt(null);
    load();
  }, [projectPath, collectionId]);

  useEffect(() => () => flush(), []);

  const update = (change: (doc: CollectionDoc) => CollectionDoc) => {
    setState((current) => {
      if (!current) return current;

      const doc = change(current.doc);

      pending.current = doc;

      if (timer.current) clearTimeout(timer.current);

      timer.current = setTimeout(() => {
        timer.current = null;
        send(doc);
      }, SAVE_DELAY_MS);

      return { ...current, doc };
    });
  };

  return {
    doc: state?.doc ?? null,
    gaps: (state?.gaps ?? []) as DocGap[],
    loading,
    saving,
    savedAt,
    update,
    saveNow: flush,
    reload: () => {
      pending.current = null;
      load();
    }
  };
}

export type CollectionDocApi = ReturnType<typeof useCollectionDoc>;
