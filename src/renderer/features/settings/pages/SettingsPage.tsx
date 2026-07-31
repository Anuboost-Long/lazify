import { useState } from "react";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { SettingsNavigation } from "../components/SettingsNavigation";
import { SettingsSectionContent } from "../components/SettingsSectionContent";
import type { SettingsSection } from "../components/settings-config";

export function SettingsPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6">
        <SettingsNavigation activeSection={activeSection} onSectionChange={setActiveSection} />
        <SettingsSectionContent activeSection={activeSection} />
      </div>
    </div>
  );
}
