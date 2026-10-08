import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./lang/en.json";

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

const lazyBundles: Record<Exclude<SupportedLanguage, "en">, () => Promise<{ default: object }>> = {
  cn: () => import("./lang/cn.json"),
  kh: () => import("./lang/kh.json")
};

export async function loadLanguage(language: SupportedLanguage): Promise<void> {
  if (language === "en" || i18n.hasResourceBundle(language, "translation")) return;

  const bundle = await lazyBundles[language]();

  i18n.addResourceBundle(language, "translation", bundle.default, true, true);
}

export async function changeLanguage(language: SupportedLanguage): Promise<void> {
  await loadLanguage(language);
  await i18n.changeLanguage(language);
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", syncDocumentLanguage);
syncDocumentLanguage(i18n.language);

export const initialLanguageReady = loadLanguage(getInitialLanguage());

export default i18n;
