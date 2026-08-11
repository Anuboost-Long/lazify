import { atom, useAtom } from "jotai";

const RESTORE_TABS_KEY = "lazify-browser-restore-tabs";

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

export function useBrowserSettings() {
  const [restoreTabs, setRestoreTabsAtom] = useAtom(restoreTabsAtom);

  function setRestoreTabs(value: boolean) {
    globalThis.localStorage.setItem(RESTORE_TABS_KEY, String(value));
    setRestoreTabsAtom(value);
  }

  return { restoreTabs, setRestoreTabs };
}
