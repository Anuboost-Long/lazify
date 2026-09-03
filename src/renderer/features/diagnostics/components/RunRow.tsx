import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { RunSummary } from "@main/diagnostic-tests/run/run-store";
import { CaptionText } from "@renderer/shared/typography";

import { formatDuration, formatRunTime } from "../lib/format-run";
import { runVerdict, toneDotClass, toneTextClass } from "../lib/run-verdict";

interface RunRowProps {
	run: RunSummary;
	selected: boolean;
	onSelect: () => void;
	onContextMenu: (event: React.MouseEvent) => void;
}

export function RunRow({ run, selected, onSelect, onContextMenu }: Readonly<RunRowProps>) {
	const { t } = useTranslation();
	const verdict = runVerdict(run.state);

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
				<span className="flex min-w-0 items-center gap-1.5">
					<span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", toneDotClass[verdict.tone])} />
					<span className="truncate text-xs font-medium text-text">{run.flowName}</span>
				</span>
				<CaptionText as="span" className="shrink-0 tabular-nums">
					{formatDuration(run.durationMs)}
				</CaptionText>
			</span>

			<span className="flex items-baseline justify-between gap-2 pl-3">
				<CaptionText as="span" className="truncate">
					{formatRunTime(run.startedAt)}
				</CaptionText>
				<span className={clsx("shrink-0 text-[11px]", toneTextClass[verdict.tone])}>
					{t(verdict.label)}
				</span>
			</span>
		</button>
	);
}
