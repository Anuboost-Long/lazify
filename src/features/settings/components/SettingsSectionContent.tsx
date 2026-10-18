import { AboutSection } from "./AboutSection";
import { AppearanceSection } from "./AppearanceSection";
import { BehaviorSection } from "./BehaviorSection";
import { BrowserSection } from "./BrowserSection";
import { ExtensionsSection } from "./ExtensionsSection";
import { FormatterSection } from "./FormatterSection";
import { KeyboardSection } from "./KeyboardSection";
import { LanguageSection } from "./LanguageSection";
import type { SettingsSection } from "./settings-config";

interface SettingsSectionContentProps {
	activeSection: SettingsSection;
}

export function SettingsSectionContent({ activeSection }: Readonly<SettingsSectionContentProps>) {
	return (
		<div className="min-w-0 flex-1">
			{activeSection === "appearance" && <AppearanceSection />}
			{activeSection === "behavior" && <BehaviorSection />}
			{activeSection === "keyboard" && <KeyboardSection />}
			{activeSection === "formatting" && <FormatterSection />}
			{activeSection === "extensions" && <ExtensionsSection />}
			{activeSection === "language" && <LanguageSection />}
			{activeSection === "browser" && <BrowserSection />}
			{activeSection === "about" && <AboutSection />}
		</div>
	);
}
