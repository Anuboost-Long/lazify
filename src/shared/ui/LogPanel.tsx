import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { formatTime, useDateTimeFormat } from "@/shared/hooks/use-date-time-format";
import type { LogEntry } from "@/shared/types/lazify";
import { SmallText, Typography } from "@/shared/typography";

import { CodeField } from "./code/CodeField";

interface LogPanelProps {
	logs: LogEntry[];
}

const streamStyles: Record<LogEntry["stream"], string> = {
	stdout: "text-text",
	stderr: "text-text",
	system: "text-text",
};

export function LogPanel({ logs }: LogPanelProps) {
	const { t } = useTranslation();
	const { timeFormat } = useDateTimeFormat();

	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="text-sm font-semibold text-text">{t(translation.LogPanel.Title)}</h2>
				<SmallText as="span" className="tabular-nums">
					{t(translation.LogPanel.EventsCount, { count: logs.length })}
				</SmallText>
			</div>

			<CodeField
				revision={logs}
				className={clsx(
					"h-120 overflow-y-auto rounded-2xl",
					"bg-soft",
					"border border-border",
					"font-mono text-sm",
					"px-4 py-3",
				)}
			>
				{logs.length === 0 ? (
					<div className="flex h-full items-center justify-center text-muted">
						<Typography as="span" variant="body" tone="inherit">
							{t(translation.LogPanel.Empty)}
						</Typography>
					</div>
				) : (
					logs.map((entry) => (
						<div
							key={entry.key}
							data-code-line=""
							className={clsx(
								"whitespace-pre-wrap border-b border-border py-2 last:border-b-0",
								streamStyles[entry.stream],
							)}
						>
							<Typography as="span" variant="pill" data-code-ignore="" className="mr-3 text-muted">
								{formatTime(new Date(entry.timestamp), timeFormat)}
							</Typography>
							{entry.message}
						</div>
					))
				)}
			</CodeField>
		</section>
	);
}
