import { useCallback, useEffect, useState } from "react";

/**
 * Lazy Shield's state, mirrored from main.
 *
 * Main owns it, because the shield has to be up before a restored tab starts
 * loading — a preference read in the renderer would arrive too late.
 */
export function useLazyShield() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void globalThis.lazify.getLazyShieldState().then((state) => {
      if (cancelled) return;
      setEnabled(state.enabled);
      setReady(state.ready);
      setBlocked(state.blocked);
    });

    // Blocking is counted in main, where the requests are actually cancelled.
    const stop = globalThis.lazify.onLazyShieldBlocked(({ blocked: count }) => {
      setBlocked(count);
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  // The first enable builds the filter engine, which can take a moment on a
  // cold cache — hence the busy flag rather than an optimistic flip.
  const toggle = useCallback(async (next: boolean) => {
    setBusy(true);
    try {
      const state = await globalThis.lazify.setLazyShield(next);
      setEnabled(state.enabled);
      setReady(state.ready);
      setBlocked(state.blocked);
    } finally {
      setBusy(false);
    }
  }, []);

  return { enabled, ready, blocked, busy, toggle };
}
