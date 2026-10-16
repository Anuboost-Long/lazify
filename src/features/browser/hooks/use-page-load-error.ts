import { useCallback, useEffect, useState, type RefObject } from "react";

import type { BrowserViewLoadFailureReason } from "@chain/sdk";

import type { Guest } from "@/platform/browser-view";

import { classifyLoadError, type BrowserError } from "../lib/browser-error";
import type { BrowserTab } from "./use-browser-tabs";

/** Watches one guest for loads that never arrived, so the tab can show why. */
export function usePageLoadError(
  viewRef: RefObject<Guest | null>,
  tab: BrowserTab
) {
  const [error, setError] = useState<BrowserError | null>(null);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const clearOnNewLoad = () => setError(null);

    const recordFailedLoad = (event: Event) => {
      const { reason, errorCode, errorDescription, validatedURL, isMainFrame } = event as Event & {
        reason?: BrowserViewLoadFailureReason;
        errorCode?: number;
        errorDescription?: string;
        validatedURL?: string;
        isMainFrame?: boolean;
      };

      // A broken iframe is the page's problem; covering a page that did load
      // would be worse than the gap it is left with.
      if (isMainFrame === false) return;

      // A stopped or superseded load is never reported, so whatever arrives failed.
      setError({
        kind: classifyLoadError(reason ?? "other", globalThis.navigator?.onLine ?? true),
        url: validatedURL || tab.currentUrl || tab.url,
        code: errorCode ?? 0,
        description: errorDescription ?? ""
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

    return () => {
      view.removeEventListener("did-start-loading", clearOnNewLoad);
      view.removeEventListener("did-fail-load", recordFailedLoad);
      view.removeEventListener("crashed", recordCrash);
    };
  }, [tab.id, tab.url, tab.currentUrl, viewRef]);

  const retry = useCallback(() => {
    setError(null);

    const view = viewRef.current;
    if (!view) return;

    view.reload();
  }, [viewRef]);

  return { error, retry };
}
