import clsx from "clsx";
import { memo, useEffect, useRef, useState } from "react";

import type { BrowserTab } from "../hooks/use-browser-tabs";

/** Session for the browser page. Must match BROWSER_PARTITION in main. */
const BROWSER_PARTITION = "persist:lazify-web";

export interface GuestStatus {
  ready: boolean;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

interface BrowserGuestProps {
  tab: BrowserTab;
  active: boolean;
  /** False while the whole browser page is off-screen. */
  surfaceVisible: boolean;
  /** Hands the element to the surface so the toolbar can drive it. */
  onRegister: (tabId: string, view: LazifyWebviewElement | null) => void;
  onStatus: (tabId: string, status: Partial<GuestStatus>) => void;
  onNavigate: (tabId: string, url: string, title: string) => void;
}

/**
 * One tab's page.
 *
 * Every guest stays mounted for as long as its tab exists — switching tabs only
 * changes which one is on top. Unmounting would stop whatever it is playing,
 * which is the whole point of this surface.
 */
export const BrowserGuest = memo(function BrowserGuest({
  tab,
  active,
  surfaceVisible,
  onRegister,
  onStatus,
  onNavigate
}: Readonly<BrowserGuestProps>) {
  const viewRef = useRef<LazifyWebviewElement | null>(null);
  const [ready, setReady] = useState(false);

  // Written once. Later addresses go through loadURL, so a re-render never
  // reloads the page underneath the user.
  const initialSrc = useRef(tab.url);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Every read can throw while the guest is detached, and an uncaught throw
    // from a DOM handler takes the whole app's tree down.
    const safely = <T,>(read: () => T, fallback: T): T => {
      try {
        return read();
      } catch {
        return fallback;
      }
    };

    const syncHistory = () =>
      onStatus(tab.id, {
        canGoBack: safely(() => view.canGoBack(), false),
        canGoForward: safely(() => view.canGoForward(), false)
      });

    const onReady = () => {
      setReady(true);
      onStatus(tab.id, { ready: true });
      syncHistory();
    };
    const onStart = () => onStatus(tab.id, { loading: true });
    const onStop = () => {
      onStatus(tab.id, { loading: false });
      syncHistory();
    };
    const onDidNavigate = () => {
      const url = safely(() => view.getURL(), "");
      if (url) onNavigate(tab.id, url, safely(() => view.getTitle(), ""));
      syncHistory();
    };
    const onTitle = (event: Event) => {
      const { title } = event as Event & { title?: string };
      if (title) onNavigate(tab.id, safely(() => view.getURL(), tab.url), title);
    };

    view.addEventListener("dom-ready", onReady);
    view.addEventListener("did-start-loading", onStart);
    view.addEventListener("did-stop-loading", onStop);
    view.addEventListener("did-navigate", onDidNavigate);
    view.addEventListener("did-navigate-in-page", onDidNavigate);
    view.addEventListener("page-title-updated", onTitle);

    return () => {
      view.removeEventListener("dom-ready", onReady);
      view.removeEventListener("did-start-loading", onStart);
      view.removeEventListener("did-stop-loading", onStop);
      view.removeEventListener("did-navigate", onDidNavigate);
      view.removeEventListener("did-navigate-in-page", onDidNavigate);
      view.removeEventListener("page-title-updated", onTitle);
    };
  }, [tab.id, tab.url, onStatus, onNavigate]);

  // Drives the guest once it can be driven. The first load needs nothing here,
  // since the tag mounted with its src already set.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !ready) return;

    try {
      if (view.getURL() === tab.url) return;
      void view.loadURL(tab.url).catch(() => undefined);
    } catch {
      // Detached mid-flight; the next dom-ready resyncs it.
    }
  }, [ready, tab.url]);

  return (
    <div
      className="absolute inset-0"
      // Hidden, never unmounted and never removed from layout: Chromium keeps
      // media running in an occluded guest but stops painting it.
      //
      // Both conditions are checked here rather than relying on the surface to
      // hide us. `visibility: hidden` on an ancestor loses to `visible` on a
      // descendant, so a guest that only consulted `active` would keep painting
      // over the whole app while the user was on another page.
      style={{
        visibility: active && surfaceVisible ? "visible" : "hidden",
        zIndex: active ? 1 : 0
      }}
    >
      <webview
        ref={(element) => {
          viewRef.current = element as LazifyWebviewElement | null;
          onRegister(tab.id, viewRef.current);
        }}
        src={initialSrc.current}
        // Occluding a guest is what stops it painting, but Chromium also
        // freezes its timers when hidden, which stops playback dead. Opting out
        // of throttling is what lets it be invisible and still audible.
        webpreferences="backgroundThrottling=no"
        partition={BROWSER_PARTITION}
        // Without this the guest's window.open returns null outright, and the
        // popup never reaches main to be turned into a tab.
        //
        // It has to be spread in as a string. Written as the bare attribute the
        // typings ask for, React reads it as `true` and then drops it — React
        // omits `true` for any attribute it does not know to be boolean — so it
        // never reaches the DOM and every popup is blocked before Electron sees
        // it. Spreading also sidesteps that `allowpopups?: boolean` typing.
        {...({ allowpopups: "" } as Record<string, string>)}
        className={clsx("absolute inset-0 flex bg-white")}
      />
    </div>
  );
});
