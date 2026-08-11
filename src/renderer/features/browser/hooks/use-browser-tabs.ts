import { useCallback, useEffect, useRef, useState } from "react";

import { useBrowserSettings } from "@renderer/shared/hooks/use-browser-settings";
import { resolveBrowserInput } from "../lib/browser-url";

/**
 * Tab state for the browser page.
 *
 * The tabs outlive the route: the surface holding them is mounted by the shell,
 * not by the page, so this state survives navigating to Agents and back — which
 * is what keeps audio playing. The list is persisted so it survives a restart
 * too, since a browser that forgets every tab on quit is not much of a browser.
 */

const TABS_KEY = "lazify-browser-tabs";

export interface BrowserTab {
  /** Stable per-tab id; survives the pages loaded into it. */
  id: string;
  /**
   * The address we asked the guest to load. Empty means the tab is still on
   * the start page and has no guest at all — an idle tab costs nothing.
   */
  url: string;
  /** What the guest reports it is showing, once it has said so. */
  currentUrl: string;
  title: string;
  /**
   * Counts the times the address bar has been submitted for this tab.
   *
   * The address alone cannot say "go there" twice: asking for the address you
   * are already on — after following links away from it, say — leaves `url`
   * untouched, and a guest watching only `url` would sit there. Bumping this
   * makes each submission a request in its own right, which is also what makes
   * Enter on an unchanged address reload the way a browser should.
   */
  navSeq: number;
}

interface StoredTab {
  id: string;
  url: string;
  title: string;
}

const newTabId = () => `tab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function makeTab(url = "", title = ""): BrowserTab {
  return { id: newTabId(), url, currentUrl: url, title, navSeq: 0 };
}

function readStoredTabs(): BrowserTab[] {
  try {
    const raw = globalThis.localStorage.getItem(TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredTab[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => typeof entry?.url === "string" && entry.url !== "about:blank")
      .map((entry) => ({
        id: entry.id || newTabId(),
        url: entry.url,
        currentUrl: entry.url,
        title: entry.title ?? "",
        navSeq: 0
      }));
  } catch {
    return [];
  }
}

export function useBrowserTabs() {
  const { restoreTabs } = useBrowserSettings();

  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    // Read once, on the mount that opens the browser: flipping the setting
    // later is about the next start, not about closing what is already open.
    const restored = restoreTabs ? readStoredTabs() : [];
    return restored.length > 0 ? restored : [makeTab()];
  });
  const [activeId, setActiveId] = useState<string>(() => "");

  // Falls back to the first tab whenever the active one is gone.
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0] ?? null;

  // Persist the addresses, not the live guest state — a restored tab reloads
  // from its URL rather than pretending it kept a session.
  //
  // Turning restore off drops what was already stored rather than merely
  // ignoring it: a session left on disk that nothing will ever read again is
  // the browsing history of someone who asked not to have one.
  useEffect(() => {
    if (!restoreTabs) {
      globalThis.localStorage.removeItem(TABS_KEY);
      return;
    }

    const stored: StoredTab[] = tabs.map((tab) => ({
      id: tab.id,
      url: tab.currentUrl || tab.url,
      title: tab.title
    }));
    globalThis.localStorage.setItem(TABS_KEY, JSON.stringify(stored));
  }, [restoreTabs, tabs]);

  const patchTab = useCallback((id: string, patch: Partial<BrowserTab>) => {
    setTabs((current) =>
      current.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab))
    );
  }, []);

  /**
   * Adds a tab and, unless told otherwise, switches to it.
   *
   * `background` is what a cmd/ctrl or middle click asks for: the page is
   * loaded and waiting, but the user keeps reading what they were on.
   */
  const openTab = useCallback((rawUrl = "", background = false) => {
    const tab = makeTab(rawUrl ? resolveBrowserInput(rawUrl) : "");
    setTabs((current) => [...current, tab]);
    if (!background) setActiveId(tab.id);
    return tab.id;
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((current) => {
      const next = current.filter((tab) => tab.id !== id);
      // The strip is never empty — closing the last tab leaves a start page.
      return next.length > 0 ? next : [makeTab()];
    });
  }, []);

  /**
   * Drops the dragged tab onto the target's position, shifting the rest.
   *
   * Only the strip's order changes. The guests are rendered from their own
   * stable order for good reason — see the note in BrowserSurface.
   */
  const reorderTab = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;

    setTabs((current) => {
      const from = current.findIndex((tab) => tab.id === fromId);
      const to = current.findIndex((tab) => tab.id === toId);

      if (from === -1 || to === -1) return current;

      const next = [...current];
      next.splice(to, 0, next.splice(from, 1)[0]);

      return next;
    });
  }, []);

  /** Points the active tab at a new address, from the bar or a shortcut. */
  const navigateActive = useCallback(
    (rawInput: string) => {
      if (!activeTab) return;
      patchTab(activeTab.id, {
        url: resolveBrowserInput(rawInput),
        navSeq: activeTab.navSeq + 1
      });
    },
    [activeTab, patchTab]
  );

  // A popup the guest tried to open arrives here as a tab instead.
  const openTabRef = useRef(openTab);
  useEffect(() => {
    openTabRef.current = openTab;
  }, [openTab]);

  useEffect(() => {
    return globalThis.lazify.onBrowserOpenTab(({ url, background }) => {
      openTabRef.current(url, background);
    });
  }, []);

  return {
    tabs,
    activeTab,
    activeId: activeTab?.id ?? "",
    setActiveId,
    openTab,
    closeTab,
    reorderTab,
    patchTab,
    navigateActive
  };
}
