import { useCallback, useEffect, useRef, useState } from "react";

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
}

interface StoredTab {
  id: string;
  url: string;
  title: string;
}

const newTabId = () => `tab-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function makeTab(url = "", title = ""): BrowserTab {
  return { id: newTabId(), url, currentUrl: url, title };
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
        title: entry.title ?? ""
      }));
  } catch {
    return [];
  }
}

export function useBrowserTabs() {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => {
    const restored = readStoredTabs();
    return restored.length > 0 ? restored : [makeTab()];
  });
  const [activeId, setActiveId] = useState<string>(() => "");

  // Falls back to the first tab whenever the active one is gone.
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0] ?? null;

  // Persist the addresses, not the live guest state — a restored tab reloads
  // from its URL rather than pretending it kept a session.
  useEffect(() => {
    const stored: StoredTab[] = tabs.map((tab) => ({
      id: tab.id,
      url: tab.currentUrl || tab.url,
      title: tab.title
    }));
    globalThis.localStorage.setItem(TABS_KEY, JSON.stringify(stored));
  }, [tabs]);

  const patchTab = useCallback((id: string, patch: Partial<BrowserTab>) => {
    setTabs((current) =>
      current.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab))
    );
  }, []);

  const openTab = useCallback((rawUrl = "") => {
    const tab = makeTab(rawUrl ? resolveBrowserInput(rawUrl) : "");
    setTabs((current) => [...current, tab]);
    setActiveId(tab.id);
    return tab.id;
  }, []);

  const closeTab = useCallback((id: string) => {
    setTabs((current) => {
      const next = current.filter((tab) => tab.id !== id);
      // The strip is never empty — closing the last tab leaves a start page.
      return next.length > 0 ? next : [makeTab()];
    });
  }, []);

  /** Points the active tab at a new address, from the bar or a shortcut. */
  const navigateActive = useCallback(
    (rawInput: string) => {
      if (!activeTab) return;
      patchTab(activeTab.id, { url: resolveBrowserInput(rawInput) });
    },
    [activeTab, patchTab]
  );

  // A popup the guest tried to open arrives here as a tab instead.
  const openTabRef = useRef(openTab);
  useEffect(() => {
    openTabRef.current = openTab;
  }, [openTab]);

  useEffect(() => {
    return globalThis.lazify.onBrowserOpenTab(({ url }) => {
      openTabRef.current(url);
    });
  }, []);

  return {
    tabs,
    activeTab,
    activeId: activeTab?.id ?? "",
    setActiveId,
    openTab,
    closeTab,
    patchTab,
    navigateActive
  };
}
