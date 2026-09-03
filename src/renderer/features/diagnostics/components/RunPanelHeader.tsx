import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { RunState } from "@main/diagnostic-tests/types";
import { CaptionText } from "@renderer/shared/typography";

import { runVerdict, toneDotClass, toneTextClass } from "../lib/run-verdict";

interface RunPanelHeaderProps {
	title: string;
	subtitle: string;
	state?: RunState;
	facts: Array<{ label: string; value: string }>;
	actions: ReactNode;
}

export function RunPanelHeader({
	title,
	subtitle,
	state,
	facts,
	actions,
}: Readonly<RunPanelHeaderProps>) {
	const { t } = useTranslation();
	const verdict = state ? runVerdict(state) : null;

	return (
		<header className="flex flex-wrap items-start justify-between gap-4 px-4 pb-3 pt-4">
			<div className="min-w-0 flex-1">
				<div className="flex min-w-0 items-center gap-2">
					<h1 className="truncate text-base font-semibold text-text">{title}</h1>
					{verdict ? (
						<span className="flex shrink-0 items-center gap-1.5">
							<span className={clsx("h-1.5 w-1.5 rounded-full", toneDotClass[verdict.tone])} aria-hidden />
							<span className={clsx("text-xs font-medium", toneTextClass[verdict.tone])}>
								{t(verdict.label)}
							</span>
						</span>
					) : null}
				</div>

				<CaptionText as="p" className="mt-0.5 truncate">
					{subtitle}
				</CaptionText>

				{facts.length > 0 ? (
					<dl className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
						{facts.map((fact) => (
							<div key={fact.label} className="flex items-baseline gap-1.5">
								<CaptionText as="dt" className="uppercase tracking-[0.14em]">
									{fact.label}
								</CaptionText>
								<CaptionText as="dd" className="!text-text tabular-nums">
									{fact.value}
								</CaptionText>
							</div>
						))}
					</dl>
				) : null}
			</div>

			<div className="flex shrink-0 items-center gap-2">{actions}</div>
		</header>
	);
}
