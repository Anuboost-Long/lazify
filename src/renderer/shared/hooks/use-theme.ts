import { atom, useAtom, useAtomValue } from "jotai";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

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

/**
 * What "system" actually resolved to. The shell owns it; anything that has to
 * colour itself in JS rather than CSS — the terminal — reads it from here.
 */
const resolvedThemeAtom = atom<ResolvedTheme>("dark");

export function useResolvedTheme() {
  return useAtomValue(resolvedThemeAtom);
}

export function useSetResolvedTheme() {
  const [, setResolved] = useAtom(resolvedThemeAtom);

  return setResolved;
}

export function useTheme() {
  const [themePreference, setThemePreferenceAtom] = useAtom(themePreferenceAtom);

  function setThemePreference(value: ThemePreference) {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, value);
    setThemePreferenceAtom(value);
  }

  return { themePreference, setThemePreference };
}
