import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { FlowSummary } from "@main/diagnostic-tests/service";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";

interface FlowRowProps {
	flow: FlowSummary;
	selected: boolean;
	onSelect: () => void;
	onContextMenu: (event: React.MouseEvent) => void;
}

export function FlowRow({ flow, selected, onSelect, onContextMenu }: Readonly<FlowRowProps>) {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			onClick={onSelect}
			onContextMenu={onContextMenu}
			aria-current={selected}
			className={clsx(
				"flex w-full flex-col gap-0.5 px-3 py-2 text-left",
				"border-l-2 transition-colors",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent",
				selected ? "border-l-accent bg-accent/5" : "border-l-transparent hover:bg-bg/60",
			)}
		>
			<span className="flex items-baseline justify-between gap-2">
				<span
					className={clsx("truncate text-xs font-semibold", selected ? "text-accent" : "text-text")}
				>
					{flow.name}
				</span>
				{flow.error ? null : (
					<CaptionText as="span" className="shrink-0 tabular-nums">
						{t(translation.Diagnostics.StepCount, { count: flow.steps.length })}
					</CaptionText>
				)}
			</span>

			<CaptionText as="span" tone={flow.error ? "error" : "muted"} className="truncate">
				{flow.error ? t(translation.Diagnostics.FlowBroken) : flow.fileName}
			</CaptionText>
		</button>
	);
}
