import { translation } from "@renderer/i18n/translation";
import type { SearchEngine } from "./types";

export const duckduckgo: SearchEngine = {
  id: "duckduckgo",
  name: "DuckDuckGo",
  descriptionKey: translation.Settings.SearchEngineDuckduckgoDesc,
  mark: "D",
  markClassName: "bg-[#de5833]/10 text-[#de5833]",
  buildSearchUrl: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
};
