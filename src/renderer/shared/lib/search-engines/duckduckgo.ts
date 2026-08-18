import { translation } from "@renderer/i18n/translation";
import duckDuckGoIcon from "@renderer/assets/duckduckgo.png";
import type { SearchEngine } from "./types";

export const duckduckgo: SearchEngine = {
  id: "duckduckgo",
  name: "DuckDuckGo",
  descriptionKey: translation.Settings.SearchEngineDuckduckgoDesc,
  mark: "D",
  iconSrc: duckDuckGoIcon,
  markClassName: "bg-transparent",
  buildSearchUrl: (query) => `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
};
