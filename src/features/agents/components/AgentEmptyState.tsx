import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { SmallText } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";

export function AgentEmptyState({ onNewAgent }: Readonly<{ onNewAgent: () => void }>) {
	const { t } = useTranslation();

	return (
		<div className="absolute inset-0 flex items-center justify-center">
			<div className="flex max-w-sm flex-col items-center gap-2 px-6 text-center">
				<p className="text-base font-semibold text-text">{t(translation.Agents.NoSession)}</p>
				<SmallText>{t(translation.Agents.NoSessionHint)}</SmallText>
				<button
					type="button"
					onClick={onNewAgent}
					className={clsx(
						"mt-3 inline-flex h-9 items-center gap-2 rounded-lg",
						"bg-accent",
						"text-sm font-semibold text-white",
						"px-3.5",
						"transition-[background-color,transform] duration-150 hover:bg-accentHover active:scale-98",
						"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
						"motion-reduce:transition-none motion-reduce:active:scale-100",
					)}
				>
					<UiIcon name="plus" className="h-4 w-4" />
					{t(translation.Agents.NewAgent)}
				</button>
			</div>
		</div>
	);
}
