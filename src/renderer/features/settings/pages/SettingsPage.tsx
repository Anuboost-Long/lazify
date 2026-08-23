import { useState } from "react";
import { SettingsNavigation } from "../components/SettingsNavigation";
import { SettingsSectionContent } from "../components/SettingsSectionContent";
import type { SettingsSection } from "../components/settings-config";

export function SettingsPage() {
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
