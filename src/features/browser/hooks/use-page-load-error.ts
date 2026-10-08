import { useCallback, useEffect, useState, type RefObject } from "react";

import {
  classifyLoadError,
  isAbortedLoad,
  netErrorName,
  type BrowserError
} from "../lib/browser-error";
import type { BrowserTab } from "./use-browser-tabs";

/** Watches one guest for loads that never arrived, so the tab can show why. */
export function usePageLoadError(
  viewRef: RefObject<LazifyWebviewElement | null>,
  tab: BrowserTab
) {
  const [error, setError] = useState<BrowserError | null>(null);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const clearOnNewLoad = () => setError(null);

    const recordFailedLoad = (event: Event) => {
      const { errorCode, errorDescription, validatedURL, isMainFrame } = event as Event & {
        errorCode?: number;
        errorDescription?: string;
        validatedURL?: string;
        isMainFrame?: boolean;
      };

      // A broken iframe is the page's problem; covering a page that did load
      // would be worse than the gap it is left with.
      if (isMainFrame === false) return;

      const code = errorCode ?? 0;
      if (isAbortedLoad(code)) return;

      setError({
        kind: classifyLoadError(code, globalThis.navigator?.onLine ?? true),
        url: validatedURL || tab.currentUrl || tab.url,
        code,
        description: errorDescription || netErrorName(code)
      });
    };

    // The page loaded and its process died afterwards, which never reaches
    // did-fail-load.
    const recordCrash = () => {
      setError({
        kind: "page-crashed",
        url: tab.currentUrl || tab.url,
        code: 0,
        description: ""
      });
    };

    view.addEventListener("did-start-loading", clearOnNewLoad);
    view.addEventListener("did-fail-load", recordFailedLoad);
    view.addEventListener("crashed", recordCrash);
    view.addEventListener("render-process-gone", recordCrash);

    return () => {
      view.removeEventListener("did-start-loading", clearOnNewLoad);
      view.removeEventListener("did-fail-load", recordFailedLoad);
      view.removeEventListener("crashed", recordCrash);
      view.removeEventListener("render-process-gone", recordCrash);
    };
  }, [tab.id, tab.url, tab.currentUrl, viewRef]);

  const retry = useCallback(() => {
    setError(null);

    const view = viewRef.current;
    if (!view) return;

    try {
      view.reload();
    } catch {
      // Detached mid-flight; the tab's next navigation resyncs it.
    }
  }, [viewRef]);

  return { error, retry };
}
