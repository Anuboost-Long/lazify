import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { BodyText, CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { settingsNavItems, type SettingsSection } from "./settings-config";

interface SettingsNavigationProps {
	activeSection: SettingsSection;
	onSectionChange: (section: SettingsSection) => void;
}

export function SettingsNavigation({ activeSection, onSectionChange }: SettingsNavigationProps) {
	const { t } = useTranslation();

	return (
		<nav className="flex w-52 flex-shrink-0 flex-col gap-1">
			{settingsNavItems.map((item) => (
				<button
					key={item.id}
					type="button"
					onClick={() => onSectionChange(item.id)}
					className={clsx(
						"flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-150",
						activeSection === item.id
							? "bg-accentSoft text-accent"
							: "text-muted hover:bg-soft hover:text-text",
					)}
				>
					<UiIcon
						name={item.icon}
						className={clsx(
							"h-5 w-5 flex-shrink-0",
							activeSection === item.id ? "text-accent" : "text-muted",
						)}
					/>
					<div>
						<BodyText className="font-semibold leading-tight" tone="inherit">
							{t(item.label)}
						</BodyText>
						<CaptionText className="mt-1 leading-snug opacity-70" tone="inherit">
							{t(item.description)}
						</CaptionText>
					</div>
				</button>
			))}
		</nav>
	);
}
