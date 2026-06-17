import { atom, useAtom } from "jotai";

export type AccentColor = "emerald" | "sky" | "violet" | "rose" | "amber" | "cyan" | "pink" | "indigo";

const ACCENT_STORAGE_KEY = "lazify-accent-color";
const DEFAULT_ACCENT: AccentColor = "emerald";

function readStoredAccent(): AccentColor {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  const stored = globalThis.localStorage.getItem(ACCENT_STORAGE_KEY);
  const valid: AccentColor[] = ["emerald", "sky", "violet", "rose", "amber", "cyan", "pink", "indigo"];
  return valid.includes(stored as AccentColor) ? (stored as AccentColor) : DEFAULT_ACCENT;
}

const accentColorAtom = atom<AccentColor>(readStoredAccent());

export function useAccentColor() {
  const [accentColor, setAccentColorAtom] = useAtom(accentColorAtom);

  function setAccentColor(value: AccentColor) {
    globalThis.localStorage.setItem(ACCENT_STORAGE_KEY, value);
    setAccentColorAtom(value);
  }

  return { accentColor, setAccentColor };
}
