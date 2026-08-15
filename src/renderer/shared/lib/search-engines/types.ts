export type SearchEngineId = "duckduckgo" | "google";

export interface SearchEngine {
  id: SearchEngineId;
  /** Brand name, never translated. */
  name: string;
  descriptionKey: string;
  /** Letter mark drawn on the picker card. */
  mark: string;
  /** Brand colour behind the mark. */
  markClassName: string;
  buildSearchUrl: (query: string) => string;
}
