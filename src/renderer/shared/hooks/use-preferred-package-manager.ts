import { atom, useAtom } from "jotai";

export type PreferredPackageManager = "npm" | "yarn" | "pnpm" | "bun";

const PM_STORAGE_KEY = "lazify-preferred-package-manager";
const DEFAULT_PM: PreferredPackageManager = "npm";

function readStoredPm(): PreferredPackageManager {
  if (typeof window === "undefined") return DEFAULT_PM;
  const stored = globalThis.localStorage.getItem(PM_STORAGE_KEY);
  if (stored === "npm" || stored === "yarn" || stored === "pnpm" || stored === "bun") {
    return stored as PreferredPackageManager;
  }
  return DEFAULT_PM;
}

const preferredPmAtom = atom<PreferredPackageManager>(readStoredPm());

export function usePreferredPackageManager() {
  const [preferredPm, setPreferredPmAtom] = useAtom(preferredPmAtom);

  function setPreferredPm(value: PreferredPackageManager) {
    globalThis.localStorage.setItem(PM_STORAGE_KEY, value);
    setPreferredPmAtom(value);
  }

  return { preferredPm, setPreferredPm };
}
