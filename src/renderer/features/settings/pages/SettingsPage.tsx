import { useState } from "react";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { SettingsNavigation } from "../components/SettingsNavigation";
import { SettingsSectionContent } from "../components/SettingsSectionContent";
import type { SettingsSection } from "../components/settings-config";

export function SettingsPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>("appearance");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t(translation.Settings.Eyebrow)}
        title={t(translation.Settings.Title)}
        description={t(translation.Settings.Description)}
        icon="settings"
      />

      <div className="flex gap-6">
        <SettingsNavigation activeSection={activeSection} onSectionChange={setActiveSection} />
        <SettingsSectionContent activeSection={activeSection} />
      </div>
    </div>
  );
}
