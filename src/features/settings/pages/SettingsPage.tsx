import { SettingsNavigation } from "../components/SettingsNavigation";
import { SettingsSectionContent } from "../components/SettingsSectionContent";
import type { SettingsSection } from "../components/settings-config";

interface SettingsPageProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export function SettingsPage({ activeSection, onSectionChange }: Readonly<SettingsPageProps>) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6">
        <SettingsNavigation activeSection={activeSection} onSectionChange={onSectionChange} />
        <SettingsSectionContent activeSection={activeSection} />
      </div>
    </div>
  );
}
