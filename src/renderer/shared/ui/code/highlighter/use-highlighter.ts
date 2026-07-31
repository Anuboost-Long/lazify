import { atom, useAtom, useAtomValue } from "jotai";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { useResolvedTheme, type ResolvedTheme } from "@renderer/shared/hooks/use-theme";

import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  getPalette,
  getVersion,
  highlight,
  highlightLine,
  listThemes,
  subscribe
} from "./registry";
import type { HighlightLine, ThemeOption } from "./types";

const STORAGE_KEY = "lazify-code-theme";

/** One code theme per app theme, so switching light/dark keeps both readable. */
export interface CodeThemeChoice {
  dark: string;
  light: string;
}

const FALLBACK: CodeThemeChoice = { dark: DEFAULT_DARK_THEME, light: DEFAULT_LIGHT_THEME };

function readStoredChoice(): CodeThemeChoice {
  if (typeof window === "undefined") return FALLBACK;

  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!stored) return FALLBACK;

    const parsed = JSON.parse(stored) as Partial<CodeThemeChoice>;

    return {
      dark: typeof parsed.dark === "string" ? parsed.dark : FALLBACK.dark,
      light: typeof parsed.light === "string" ? parsed.light : FALLBACK.light
    };
  } catch {
    return FALLBACK;
  }
}

const codeThemeAtom = atom<CodeThemeChoice>(readStoredChoice());

/** Re-renders subscribers whenever a grammar or theme finishes loading. */
function useHighlightVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

/** The code theme id in force right now, following the app's light/dark mode. */
export function useCodeThemeId() {
  const resolved = useResolvedTheme();
  const choice = useAtomValue(codeThemeAtom);

  return choice[resolved];
}

export function useCodeTheme() {
  const resolved = useResolvedTheme();
  const [choice, setChoice] = useAtom(codeThemeAtom);
  const version = useHighlightVersion();

  const setCodeTheme = useCallback(
    (mode: ResolvedTheme, themeId: string) => {
      setChoice((current) => {
        const next = { ...current, [mode]: themeId };
        globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

        return next;
      });
    },
    [setChoice]
  );

  // Themes are listed from the registry, which only knows about user drop-ins
  // after boot — hence the version dependency.
  const options = useMemo<ThemeOption[]>(() => listThemes(), [version]);

  return { choice, activeThemeId: choice[resolved], resolved, options, setCodeTheme };
}

/** The active theme's editor colours, or `null` until it has loaded. */
export function useCodePalette() {
  const themeId = useCodeThemeId();
  const version = useHighlightVersion();

  return useMemo(() => getPalette(themeId), [themeId, version]);
}

/**
 * A whole document, tokenised with real grammars. `null` means "not ready" —
 * callers paint with the fallback scanner until the next version bump.
 */
export function useHighlightedDocument(code: string, languageId: string): HighlightLine[] | null {
  const themeId = useCodeThemeId();
  const version = useHighlightVersion();

  return useMemo(() => highlight(code, languageId, themeId), [code, languageId, themeId, version]);
}

/** One line, for rows that arrive without the rest of their file. */
export function useHighlightedLine(text: string, languageId: string): HighlightLine | null {
  const themeId = useCodeThemeId();
  const version = useHighlightVersion();

  return useMemo(
    () => highlightLine(text, languageId, themeId),
    [text, languageId, themeId, version]
  );
}
