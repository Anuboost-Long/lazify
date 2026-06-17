import { useTranslation } from "react-i18next";
import {
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  type SupportedLanguage
} from "@renderer/i18n/i18n";
import { translation } from "@renderer/i18n/translation";
import { DateTimeSection } from "./DateTimeSection";
import { LanguageOptionButton } from "./LanguageOptionButton";
import { languages } from "./settings-config";
import { SectionLabel } from "./SectionLabel";

export function LanguageSection() {
  const { t, i18n } = useTranslation();
  const selected = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);

  const handleLanguageChange = (language: SupportedLanguage) => {
    globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    void i18n.changeLanguage(language);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>{t(translation.Settings.InterfaceLanguage)}</SectionLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {languages.map((language) => (
            <LanguageOptionButton
              key={language.code}
              code={language.code}
              label={language.label}
              native={language.native}
              region={language.region}
              selected={selected === language.code}
              onSelect={handleLanguageChange}
            />
          ))}
        </div>
      </div>

      <DateTimeSection />
    </div>
  );
}
