import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { FindingReference } from "@main/linting";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { findingKey, groupFindings } from "./finding-groups";
import { FindingsGroup } from "./FindingsGroup";
import { useCodeQualityActions } from "./quality-actions";

interface FindingsPanelProps {
	findings: FindingReference[];
	/** Reveals a line in the editor above, the way clicking a result does. */
	onReveal: (line: number) => void;
}

/**
 * Every finding in the open file, and a way to act on several at once.
 *
 * The underline says where a problem is; this says how many there are and lets
 * a batch be handed over in one go. Collapsed by default — the count is what
 * most readers want, and the list is what they open when they mean to act.
 */
export function FindingsPanel({ findings, onReveal }: Readonly<FindingsPanelProps>) {
	const { t } = useTranslation();
	const actions = useCodeQualityActions();
	const [open, setOpen] = useState(false);
	const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());

	// A new scan is a new set of findings, and a tick on one that no longer
	// exists would silently send nothing.
	useEffect(() => setTicked(new Set()), [findings]);

	const groups = useMemo(() => groupFindings(findings), [findings]);

	if (findings.length === 0) return null;

	const selected = findings.filter((finding) => ticked.has(findingKey(finding)));
	const chosen = selected.length > 0 ? selected : findings;
	const allTicked = ticked.size === findings.length;

	const toggle = (finding: FindingReference) =>
		setTicked((current) => {
			const next = new Set(current);
			const key = findingKey(finding);

			if (next.has(key)) next.delete(key);
			else next.add(key);

			return next;
		});

	return (
		<div className="shrink-0 border-t border-border bg-soft">
			<div className="flex items-center gap-2 px-3 py-2">
				<button
					type="button"
					onClick={() => setOpen((current) => !current)}
					aria-expanded={open}
					className="flex min-w-0 items-center gap-2 text-left"
				>
					<UiIcon name={open ? "collapse" : "expand"} className="h-3.5 w-3.5 shrink-0 text-muted" />
					<span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
					<SmallText as="span" className="!text-text">
						{t(translation.CodeQuality.FindingCount, { count: findings.length })}
					</SmallText>
				</button>

				{actions ? (
					<div className="ml-auto flex shrink-0 items-center gap-2">
						{selected.length > 0 ? (
							<CaptionText tone="muted">
								{t(translation.CodeQuality.SelectedCount, { count: selected.length })}
							</CaptionText>
						) : null}

						<button
							type="button"
							onClick={() => actions.fix(chosen)}
							className="rounded-xl border border-border px-2.5 py-1 text-xs text-accent transition-colors hover:border-accent/30"
						>
							{t(translation.CodeQuality.FixWithAgent)}
						</button>

						{actions.createTask ? (
							<button
								type="button"
								onClick={() => actions.createTask?.(chosen)}
								className="rounded-xl border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent/30 hover:text-text"
							>
								{t(translation.CodeQuality.CreateTask)}
							</button>
						) : null}
					</div>
				) : null}
			</div>

			{open ? (
				<div className="max-h-48 overflow-y-auto border-t border-border">
					<label className="flex items-center gap-2.5 border-b border-border px-3 py-1.5">
						<input
							type="checkbox"
							checked={allTicked}
							onChange={() => setTicked(allTicked ? new Set() : new Set(findings.map(findingKey)))}
							className="h-3.5 w-3.5 shrink-0 accent-accent"
						/>
						<CaptionText tone="muted">{t(translation.CodeQuality.SelectAll)}</CaptionText>
					</label>

					{groups.map((group) => (
						<FindingsGroup
							key={group.source}
							group={group}
							labelled={groups.length > 1}
							ticked={ticked}
							onToggle={toggle}
							onReveal={onReveal}
						/>
					))}
				</div>
			) : null}
		</div>
	);
}

export { findingKey };
