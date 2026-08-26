import { AboutSection } from "./AboutSection";
import { AppearanceSection } from "./AppearanceSection";
import { BehaviorSection } from "./BehaviorSection";
import { BrowserSection } from "./BrowserSection";
import { ExtensionsSection } from "./ExtensionsSection";
import { FormatterSection } from "./FormatterSection";
import { LanguageSection } from "./LanguageSection";
import type { SettingsSection } from "./settings-config";

interface SettingsSectionContentProps {
	activeSection: SettingsSection;
}

export function SettingsSectionContent({ activeSection }: SettingsSectionContentProps) {
	return (
		<div className="min-w-0 flex-1">
			{activeSection === "appearance" && <AppearanceSection />}
			{activeSection === "behavior" && <BehaviorSection />}
			{activeSection === "formatting" && <FormatterSection />}
			{activeSection === "extensions" && <ExtensionsSection />}
			{activeSection === "language" && <LanguageSection />}
			{activeSection === "browser" && <BrowserSection />}
			{activeSection === "about" && <AboutSection />}
		</div>
	);
}
