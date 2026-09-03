import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { StepStatus } from "@main/diagnostic-tests/types";
import { MonoText } from "@renderer/shared/typography";

import { formatDuration } from "../lib/format-run";
import { stepVerdict, toneTextClass } from "../lib/run-verdict";

export interface TimelineStep {
	index: number;
	description: string;
	status?: StepStatus;
	durationMs?: number;
	message?: string;
}

export function StepRow({ step }: Readonly<{ step: TimelineStep }>) {
	const { t } = useTranslation();
	const verdict = step.status ? stepVerdict(step.status) : null;
	const failed = step.status === "failed";

	return (
		<li
			className={clsx(
				"flex gap-3 py-2 pr-4",
				failed ? "border-l-2 border-l-error bg-error/5 pl-[14px]" : "pl-4",
			)}
		>
			<MonoText as="span" className="w-6 shrink-0 pt-px tabular-nums">
				{String(step.index + 1).padStart(2, "0")}
			</MonoText>

			<div className="min-w-0 flex-1">
				<p
					className={clsx(
						"text-[13px] leading-5",
						step.status === "skipped" ? "text-muted" : "text-text",
					)}
				>
					{step.description}
				</p>

				{step.message ? (
					<MonoText as="pre" className="mt-1 whitespace-pre-wrap break-words !text-error">
						{step.message}
					</MonoText>
				) : null}
			</div>

			{step.durationMs ? (
				<MonoText as="span" className="shrink-0 pt-px tabular-nums">
					{formatDuration(step.durationMs)}
				</MonoText>
			) : null}

			{verdict ? (
				<span
					className={clsx(
						"w-14 shrink-0 pt-px text-right text-[11px] font-medium",
						toneTextClass[verdict.tone],
					)}
				>
					{t(verdict.label)}
				</span>
			) : null}
		</li>
	);
}
