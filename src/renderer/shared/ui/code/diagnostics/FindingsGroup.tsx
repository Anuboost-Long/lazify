import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { FindingReference } from "@main/linting";
import { CaptionText, SmallText } from "@renderer/shared/typography";

import { findingKey, type FindingGroup } from "./finding-groups";

interface FindingsGroupProps {
	group: FindingGroup;
	labelled: boolean;
	ticked: ReadonlySet<string>;
	onToggle: (finding: FindingReference) => void;
	onReveal: (line: number) => void;
}

export function FindingsGroup({
	group,
	labelled,
	ticked,
	onToggle,
	onReveal,
}: Readonly<FindingsGroupProps>) {
	const { t } = useTranslation();

	return (
		<div>
			{labelled ? (
				<div className="flex items-center gap-2 bg-soft/60 px-3 py-1">
					<CaptionText tone="muted" className="uppercase tracking-wide">
						{t(group.label)}
					</CaptionText>
					<CaptionText tone="muted" className="ml-auto tabular-nums">
						{group.findings.length}
					</CaptionText>
				</div>
			) : null}

			{group.findings.map((finding) => (
				<div
					key={findingKey(finding)}
					className="flex items-center gap-2.5 border-b border-border/60 px-3 py-1.5 last:border-b-0"
				>
					<input
						type="checkbox"
						checked={ticked.has(findingKey(finding))}
						onChange={() => onToggle(finding)}
						aria-label={finding.diagnostic.message}
						className="h-3.5 w-3.5 shrink-0 accent-accent"
					/>
					<button
						type="button"
						onClick={() => onReveal(finding.diagnostic.line)}
						className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
					>
						<span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted/80">
							{finding.diagnostic.line}
						</span>
						{finding.diagnostic.code ? (
							<span
								className={clsx(
									"shrink-0 font-mono text-[11px]",
									group.source === "tailwindcss" ? "text-accent" : "text-warning",
								)}
							>
								{finding.diagnostic.code}
							</span>
						) : null}
						<SmallText as="span" className="truncate !text-text">
							{finding.diagnostic.message}
						</SmallText>
					</button>
				</div>
			))}
		</div>
	);
}
