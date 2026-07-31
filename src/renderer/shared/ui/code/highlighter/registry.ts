/**
 * The highlighting engine: real TextMate grammars and real VS Code themes,
 * loaded on demand.
 *
 * Everything here is a module singleton rather than React state, because the
 * engine is expensive, shared by every code pane, and outlives any component.
 * Components subscribe to `subscribe`/`getVersion` and re-render when new
 * capability lands.
 *
 * The public tokenising call is synchronous and returns `null` while an asset
 * is still loading, which is what lets callers fall back to the fast scanner
 * in `../tokenize` instead of flashing unstyled text.
 */

import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import { bundledLanguagesInfo } from "shiki/langs";
import { bundledThemesInfo } from "shiki/themes";
import type { LanguageRegistration, ThemeRegistrationAny } from "shiki/core";

import {
  PLAIN_LANGUAGE,
  languageIdOf,
  setGrammarExtensions,
  setUserExtensions
} from "./languages";
import type {
  HighlightLine,
  HighlightingAssets,
  LanguageOption,
  ThemeOption,
  ThemePalette
} from "./types";

export const DEFAULT_DARK_THEME = "dark-plus";
export const DEFAULT_LIGHT_THEME = "light-plus";

/** Shiki serves these without a grammar, so they never need loading. */
const SPECIAL_LANGUAGES = new Set(["plaintext", "text", "txt", "plain", "ansi"]);

/**
 * Grammar runs are synchronous and unbounded, so a very large file would block
 * the frame. Past this size the cheap scanner takes over permanently — the
 * same trade VS Code makes when it stops tokenising huge files.
 */
const MAX_DOCUMENT_LENGTH = 400_000;

const bundledThemeIds = new Map(bundledThemesInfo.map((theme) => [theme.id, theme]));
const bundledLanguageIds = new Map(bundledLanguagesInfo.map((language) => [language.id, language]));

let highlighter: HighlighterCore | null = null;
let bootPromise: Promise<void> | null = null;
let assetDirectory = "";

const userThemes = new Map<string, { registration: ThemeRegistrationAny; label: string; type: "light" | "dark" }>();
const userLanguages = new Map<string, { registration: LanguageRegistration; label: string }>();

const loadedThemes = new Set<string>();
const loadedLanguages = new Set<string>();
const inFlight = new Map<string, Promise<void>>();
/** Assets that threw once; retrying them every render would thrash. */
const broken = new Set<string>();

let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getVersion() {
  return version;
}

/** Where user themes and grammars are read from, for display in settings. */
export function getAssetDirectory() {
  return assetDirectory;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Pulls user drop-ins off disk. A failure here is not fatal — the bundled sets
 * still work — so it degrades to an empty asset list.
 */
async function loadUserAssets(): Promise<HighlightingAssets | null> {
  const api = globalThis.window?.lazify;
  if (!api?.listHighlightingAssets) return null;

  try {
    return await api.listHighlightingAssets();
  } catch {
    return null;
  }
}

function registerUserAssets(assets: HighlightingAssets | null) {
  if (!assets) return;

  assetDirectory = assets.directory;

  for (const theme of assets.themes) {
    if (!isRecord(theme.data)) continue;

    userThemes.set(theme.id, {
      // Shiki keys a theme by its `name`, so force it to match the id we list.
      registration: { ...theme.data, name: theme.id } as ThemeRegistrationAny,
      label: theme.displayName,
      type: theme.type
    });
  }

  const grammarExtensions: Record<string, string> = {};

  for (const language of assets.languages) {
    if (!isRecord(language.data)) continue;

    userLanguages.set(language.id, {
      registration: { ...language.data, name: language.id } as LanguageRegistration,
      label: language.displayName
    });

    for (const fileType of language.fileTypes) {
      grammarExtensions[fileType.replace(/^\./, "").toLowerCase()] = language.id;
    }
  }

  setGrammarExtensions(grammarExtensions);
  setUserExtensions(assets.extensions);
}

/**
 * Brings the engine up once. The WASM regex engine is dynamically imported so
 * it stays out of the initial bundle — nothing pays for it until a code pane
 * is actually opened.
 */
function boot() {
  bootPromise ??= (async () => {
    registerUserAssets(await loadUserAssets());

    highlighter = await createHighlighterCore({
      engine: createOnigurumaEngine(() => import("shiki/wasm").then((module) => module.default)),
      themes: [],
      langs: []
    });

    notify();
  })().catch(() => {
    // Leaving `highlighter` null keeps every caller on the fallback scanner.
    bootPromise = null;
  });

  return bootPromise;
}

function loadOnce(key: string, load: () => Promise<void>) {
  if (inFlight.has(key) || broken.has(key)) return;

  const task = load()
    .then(notify)
    .catch(() => {
      broken.add(key);
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, task);
}

function ensureTheme(id: string) {
  if (!highlighter || loadedThemes.has(id) || broken.has(`theme:${id}`)) return;

  loadOnce(`theme:${id}`, async () => {
    const user = userThemes.get(id);

    if (user) {
      await highlighter!.loadTheme(user.registration);
    } else {
      const bundled = bundledThemeIds.get(id);
      if (!bundled) throw new Error(`Unknown theme: ${id}`);
      await highlighter!.loadTheme(bundled.import);
    }

    loadedThemes.add(id);
  });
}

function ensureLanguage(id: string) {
  if (!highlighter || loadedLanguages.has(id) || broken.has(`lang:${id}`)) return;

  loadOnce(`lang:${id}`, async () => {
    const user = userLanguages.get(id);

    if (user) {
      await highlighter!.loadLanguage(user.registration);
    } else {
      const bundled = bundledLanguageIds.get(id);
      if (!bundled) throw new Error(`Unknown language: ${id}`);
      await highlighter!.loadLanguage(bundled.import);
    }

    loadedLanguages.add(id);
  });
}

/** A language we have no grammar for is painted as plain text, not dropped. */
function resolveLanguage(id: string) {
  if (SPECIAL_LANGUAGES.has(id)) return PLAIN_LANGUAGE;
  if (userLanguages.has(id) || bundledLanguageIds.has(id)) return id;

  return PLAIN_LANGUAGE;
}

function isReady(languageId: string, themeId: string) {
  if (!highlighter) return false;
  if (!loadedThemes.has(themeId)) return false;

  return languageId === PLAIN_LANGUAGE || loadedLanguages.has(languageId);
}

/**
 * Tokenises a whole document. Returns `null` when the engine or one of its
 * assets is not ready yet, having started the load — call again on the next
 * `subscribe` notification.
 */
export function highlight(code: string, fileLanguage: string, themeId: string): HighlightLine[] | null {
  if (code.length > MAX_DOCUMENT_LENGTH) return null;

  if (!highlighter) {
    void boot();
    return null;
  }

  const language = resolveLanguage(fileLanguage);

  ensureTheme(themeId);
  if (language !== PLAIN_LANGUAGE) ensureLanguage(language);

  if (!isReady(language, themeId)) return null;

  try {
    return highlighter.codeToTokensBase(code, { lang: language, theme: themeId });
  } catch {
    broken.add(`lang:${language}`);
    return null;
  }
}

/**
 * Single-line tokenising for rows that arrive without their file — diff rows,
 * mostly. Results are cached because a diff re-renders the same lines often
 * and each one is a fresh grammar run.
 */
const lineCache = new Map<string, HighlightLine>();
const LINE_CACHE_LIMIT = 4000;

export function highlightLine(text: string, fileLanguage: string, themeId: string): HighlightLine | null {
  const key = `${themeId} ${fileLanguage} ${text}`;
  const cached = lineCache.get(key);
  if (cached) return cached;

  const lines = highlight(text, fileLanguage, themeId);
  if (!lines) return null;

  const line = lines[0] ?? [];

  // A blunt reset beats an LRU here; the cache refills in a frame.
  if (lineCache.size >= LINE_CACHE_LIMIT) lineCache.clear();
  lineCache.set(key, line);

  return line;
}

/** Editor foreground/background for the active theme, once it has loaded. */
export function getPalette(themeId: string): ThemePalette | null {
  if (!highlighter || !loadedThemes.has(themeId)) return null;

  try {
    const theme = highlighter.getTheme(themeId);

    return { fg: theme.fg, bg: theme.bg };
  } catch {
    return null;
  }
}

export function listThemes(): ThemeOption[] {
  const user: ThemeOption[] = [...userThemes.entries()].map(([id, theme]) => ({
    id,
    label: theme.label,
    type: theme.type,
    source: "user"
  }));

  const bundled: ThemeOption[] = bundledThemesInfo.map((theme) => ({
    id: theme.id,
    label: theme.displayName ?? theme.id,
    type: theme.type,
    source: "bundled"
  }));

  return [...user, ...bundled];
}

export function listLanguages(): LanguageOption[] {
  const user: LanguageOption[] = [...userLanguages.entries()].map(([id, language]) => ({
    id,
    label: language.label,
    source: "user"
  }));

  const bundled: LanguageOption[] = bundledLanguagesInfo.map((language) => ({
    id: language.id,
    label: language.name,
    source: "bundled"
  }));

  return [...user, ...bundled];
}

/** Drops every cached asset so freshly edited user files are picked up. */
export async function reloadHighlighter() {
  highlighter = null;
  bootPromise = null;
  userThemes.clear();
  userLanguages.clear();
  loadedThemes.clear();
  loadedLanguages.clear();
  inFlight.clear();
  broken.clear();
  lineCache.clear();
  notify();

  await boot();
}

export { languageIdOf, PLAIN_LANGUAGE };
