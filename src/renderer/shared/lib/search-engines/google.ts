import { translation } from "@renderer/i18n/translation";
import type { SearchEngine } from "./types";

export const google: SearchEngine = {
  id: "google",
  name: "Google",
  descriptionKey: translation.Settings.SearchEngineGoogleDesc,
  mark: "G",
  markClassName: "bg-[#4285f4]/10 text-[#4285f4]",
  buildSearchUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`
};
