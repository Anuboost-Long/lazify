import { translation } from "@renderer/i18n/translation";
import googleIcon from "@renderer/assets/google.png";
import type { SearchEngine } from "./types";

export const google: SearchEngine = {
  id: "google",
  name: "Google",
  descriptionKey: translation.Settings.SearchEngineGoogleDesc,
  mark: "G",
  iconSrc: googleIcon,
  markClassName: "bg-transparent",
  buildSearchUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`
};
