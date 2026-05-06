import { useState } from "react";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { useTheme } from "@renderer/shared/hooks/use-theme";
import type { ThemePreference } from "@renderer/shared/hooks/use-theme";
import { themeOptions } from "./settings-config";
import { AccentColorSection } from "./AccentColorSection";
import { InterfaceSection } from "./InterfaceSection";
import { JsToolsSection } from "./JsToolsSection";
import { SectionLabel } from "./SectionLabel";
import { ThemeOptionCard } from "./ThemeOptionCard";

export function AppearanceSection() {
  const { t } = useTranslation();
  const { themePreference, setThemePreference } = useTheme();
  const [selectedAccent, setSelectedAccent] = useState("emerald");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>{t(translation.Settings.Theme)}</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((theme) => (
            <ThemeOptionCard
              key={theme.id}
              id={theme.id}
              label={theme.label}
              icon={theme.icon}
              selected={themePreference === theme.id}
              onSelect={(id) => setThemePreference(id as ThemePreference)}
            />
          ))}
        </div>
      </div>

      <AccentColorSection selectedAccent={selectedAccent} onSelectAccent={setSelectedAccent} />
      <InterfaceSection />
      <JsToolsSection />
    </div>
  );
}
