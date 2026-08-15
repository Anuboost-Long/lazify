import { atom, useAtom } from "jotai";

import {
  DEFAULT_SEARCH_ENGINE_ID,
  isSearchEngineId,
  type SearchEngineId
} from "@renderer/shared/lib/search-engines";

const RESTORE_TABS_KEY = "lazify-browser-restore-tabs";
const SEARCH_ENGINE_KEY = "lazify-browser-search-engine";

function readBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const stored = globalThis.localStorage.getItem(key);
  return stored === null ? defaultValue : stored === "true";
}

/**
 * Defaults to on, which is what the browser has always done — a tab strip that
 * came back empty after a restart would be a regression for anyone who has been
 * using it. Turning it off is for people who would rather each session start
 * clean.
 */
const restoreTabsAtom = atom(readBool(RESTORE_TABS_KEY, true));

function readSearchEngine(): SearchEngineId {
  if (typeof window === "undefined") return DEFAULT_SEARCH_ENGINE_ID;
  const stored = globalThis.localStorage.getItem(SEARCH_ENGINE_KEY);
  return isSearchEngineId(stored) ? stored : DEFAULT_SEARCH_ENGINE_ID;
}

const searchEngineAtom = atom(readSearchEngine());

export function useBrowserSettings() {
  const [restoreTabs, setRestoreTabsAtom] = useAtom(restoreTabsAtom);
  const [searchEngine, setSearchEngineAtom] = useAtom(searchEngineAtom);

  function setRestoreTabs(value: boolean) {
    globalThis.localStorage.setItem(RESTORE_TABS_KEY, String(value));
    setRestoreTabsAtom(value);
  }

  function setSearchEngine(value: SearchEngineId) {
    globalThis.localStorage.setItem(SEARCH_ENGINE_KEY, value);
    setSearchEngineAtom(value);
  }

  return { restoreTabs, setRestoreTabs, searchEngine, setSearchEngine };
}
