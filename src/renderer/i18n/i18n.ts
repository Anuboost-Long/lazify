import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import cn from "./lang/cn.json";
import en from "./lang/en.json";
import kh from "./lang/kh.json";

export const LANGUAGE_STORAGE_KEY = "lazify-language";

export type SupportedLanguage = "en" | "kh" | "cn";

export function normalizeLanguage(value: string | undefined | null): SupportedLanguage {
  const language = value?.toLowerCase().split("-")[0];

  if (language === "kh" || language === "km") {
    return "kh";
  }

  if (language === "cn" || language === "zh") {
    return "cn";
  }

  return "en";
}

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return "en";
  }

  return normalizeLanguage(globalThis.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

function syncDocumentLanguage(language: string | undefined | null) {
  if (typeof document === "undefined") {
    return;
  }

  const normalizedLanguage = normalizeLanguage(language);
  document.documentElement.lang = normalizedLanguage;
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    kh: { translation: kh },
    cn: { translation: cn },
  },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", syncDocumentLanguage);
syncDocumentLanguage(i18n.language);

export default i18n;
