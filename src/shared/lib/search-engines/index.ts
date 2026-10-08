import { duckduckgo } from "./duckduckgo";
import { google } from "./google";
import type { SearchEngine, SearchEngineId } from "./types";

/** What the browser has always searched with, so nobody's default moves. */
export const DEFAULT_SEARCH_ENGINE: SearchEngine = duckduckgo;
export const DEFAULT_SEARCH_ENGINE_ID: SearchEngineId = DEFAULT_SEARCH_ENGINE.id;

/** Picker order. */
export const SEARCH_ENGINES: SearchEngine[] = [duckduckgo, google];

export function findSearchEngine(id: string | null): SearchEngine {
  return SEARCH_ENGINES.find((engine) => engine.id === id) ?? DEFAULT_SEARCH_ENGINE;
}

export function isSearchEngineId(value: string | null): value is SearchEngineId {
  return SEARCH_ENGINES.some((engine) => engine.id === value);
}

export { duckduckgo, google };
export type { SearchEngine, SearchEngineId };
