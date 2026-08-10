import { useCallback, useEffect, useState } from "react";

import type { UpdateState } from "@renderer/shared/types/lazify";

/**
 * The in-app updater, as the Settings pane sees it.
 *
 * Main owns the state, because a download outlives whatever route the user
 * navigates to next. This subscribes to the changes and reads the current
 * state on mount, so arriving mid-download shows the progress already running.
 */
export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    void globalThis.lazify
      .getUpdateState()
      .then((current) => {
        // A change that landed while this was in flight is the newer truth.
        if (!cancelled) setState((live) => (live.status === "idle" ? current : live));
      })
      .catch(() => undefined);

    const unsubscribe = globalThis.lazify.onUpdateStateChanged(setState);

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Both of these resolve with the state they ended on, which the events have
  // usually already delivered. Setting it again costs nothing and covers the
  // case where the call failed before any event fired.
  const check = useCallback(() => {
    void globalThis.lazify.checkForUpdates().then(setState).catch(() => undefined);
  }, []);

  const download = useCallback(() => {
    void globalThis.lazify.downloadUpdate().then(setState).catch(() => undefined);
  }, []);

  const install = useCallback(() => {
    void globalThis.lazify.quitAndInstallUpdate().catch(() => undefined);
  }, []);

  return { state, check, download, install };
}
