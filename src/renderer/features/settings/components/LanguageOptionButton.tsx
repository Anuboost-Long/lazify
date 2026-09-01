import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { SupportedLanguage } from "@renderer/i18n/i18n";
import { BodyText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface LanguageOptionButtonProps {
	code: SupportedLanguage;
	label: string;
	native: string;
	region: string;
	selected: boolean;
	onSelect: (language: SupportedLanguage) => void;
}

export function LanguageOptionButton({
	code,
	label,
	native,
	region,
	selected,
	onSelect,
}: Readonly<LanguageOptionButtonProps>) {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			onClick={() => onSelect(code)}
			className={clsx(
				"flex items-center justify-between rounded-2xl border px-4 py-3.5",
				"text-left transition-all duration-150",
				selected ? "border-accent bg-accentSoft" : "border-border bg-soft hover:border-accent/40",
			)}
		>
			<div>
				<BodyText className={clsx("font-semibold", selected ? "text-accent" : "text-text")}>
					{native}
				</BodyText>
				<SmallText className="mt-0.5">
					{t(label)} · {t(region)}
				</SmallText>
			</div>
			{selected && <UiIcon name="check-circle" className="h-4 w-4 text-accent" />}
		</button>
	);
}
