import { atom, useAtom } from "jotai";

export type ThemePreference = "dark" | "light" | "system";

const THEME_STORAGE_KEY = "lazify-theme";

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "dark";
  const stored = globalThis.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored;
  }
  return "dark";
}

const themePreferenceAtom = atom<ThemePreference>(readStoredTheme());

export function useTheme() {
  const [themePreference, setThemePreferenceAtom] = useAtom(themePreferenceAtom);

  function setThemePreference(value: ThemePreference) {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, value);
    setThemePreferenceAtom(value);
  }

  return { themePreference, setThemePreference };
}
