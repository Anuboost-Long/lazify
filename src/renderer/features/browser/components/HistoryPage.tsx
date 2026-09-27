import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatDate, formatTime, useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";
import type { DateFormatId } from "@renderer/features/settings/components/settings-config";
import { CaptionText, CardTitle, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useBrowserHistory, type HistoryEntry } from "../hooks/use-browser-history";
import { tabLabel } from "../lib/browser-url";

interface HistoryGroup {
	label: string;
	entries: HistoryEntry[];
}

/** Buckets already-newest-first entries under the day they were visited. */
function groupByDay(
	entries: HistoryEntry[],
	today: string,
	yesterday: string,
	dateFormat: DateFormatId,
): HistoryGroup[] {
	const groups: HistoryGroup[] = [];

	for (const entry of entries) {
		const visited = new Date(entry.visitedAt);
		const dayKey = visited.toDateString();
		const label =
			dayKey === today ? "today" : dayKey === yesterday ? "yesterday" : formatDate(visited, dateFormat);

		const current = groups.at(-1);
		if (current?.label === label) current.entries.push(entry);
		else groups.push({ label, entries: [entry] });
	}

	return groups;
}

interface HistoryPageProps {
	/** Closes the history tab without acting on anything. */
	onClose: () => void;
	/** Opens the entry's address as a new tab. */
	onOpenUrl: (url: string) => void;
}

/**
 * The full history log, rendered as a tab's own content.
 *
 * A tab rather than an overlay on purpose: a `<webview>` composites above the
 * rest of the window regardless of CSS z-index, so nothing drawn over an
 * active guest is reliably visible. A tab with no guest at all — the same
 * trick the start page uses — sidesteps that entirely.
 */
export function HistoryPage({ onClose, onOpenUrl }: Readonly<HistoryPageProps>) {
	const { t } = useTranslation();
	const { dateFormat, timeFormat } = useDateTimeFormat();
	const { history, removeEntry, clearHistory } = useBrowserHistory();
	const [query, setQuery] = useState("");

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return history;
		return history.filter(
			(entry) =>
				entry.title.toLowerCase().includes(needle) || entry.url.toLowerCase().includes(needle),
		);
	}, [history, query]);

	const groups = useMemo(() => {
		const today = new Date().toDateString();
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
		return groupByDay(filtered, today, yesterday, dateFormat);
	}, [filtered, dateFormat]);

	const groupLabel = (label: string) =>
		label === "today"
			? t(translation.Browser.HistoryToday)
			: label === "yesterday"
				? t(translation.Browser.HistoryYesterday)
				: label;

	return (
		<div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-bg">
			<div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-bg px-6 py-4">
				<IconButton icon="arrow-left" title={t(translation.GlobalTerm.Back)} onClick={onClose} />
				<CardTitle className="text-base">{t(translation.Browser.History)}</CardTitle>

				<div className="ml-auto flex items-center gap-2">
					<div
						className={clsx(
							"flex items-center gap-2 rounded-lg border bg-soft px-3 py-1.5",
							"border-black/[0.06] dark:border-white/[0.06]",
						)}
					>
						<UiIcon name="search" className="h-3.5 w-3.5 shrink-0 text-muted" />
						<input
							autoFocus
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t(translation.Browser.HistorySearchPlaceholder)}
							aria-label={t(translation.Browser.HistorySearchPlaceholder)}
							spellCheck={false}
							className="w-56 bg-transparent text-[12px] text-text outline-none placeholder:text-muted"
						/>
					</div>
					{history.length > 0 ? (
						<IconButton
							icon="trash"
							title={t(translation.Browser.HistoryClear)}
							onClick={clearHistory}
						/>
					) : null}
				</div>
			</div>

			<div className="mx-auto w-full max-w-2xl flex-1 px-6 py-6">
				{filtered.length === 0 ? (
					<CaptionText tone="muted" className="block py-16 text-center">
						{t(
							history.length === 0
								? translation.Browser.HistoryEmpty
								: translation.Browser.HistoryNoResults,
						)}
					</CaptionText>
				) : (
					groups.map((group) => (
						<div key={group.label} className="mb-6 last:mb-0">
							<SmallText className="!text-muted mb-2 block font-medium">
								{groupLabel(group.label)}
							</SmallText>

							<div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
								{group.entries.map((entry) => (
									<div
										key={entry.id}
										className="group flex items-center gap-3 px-4 py-2.5 hover:bg-text/[0.04]"
									>
										<CaptionText tone="muted" className="w-16 shrink-0 !text-[11px]">
											{formatTime(new Date(entry.visitedAt), timeFormat)}
										</CaptionText>
										<UiIcon name="globe" className="h-3.5 w-3.5 shrink-0 text-muted" />
										<button
											type="button"
											onClick={() => onOpenUrl(entry.url)}
											className="min-w-0 flex-1 text-left"
										>
											<SmallText className="!text-text block truncate">
												{entry.title || tabLabel(entry.url)}
											</SmallText>
											<CaptionText tone="muted" className="block truncate !text-[10px]">
												{entry.url}
											</CaptionText>
										</button>
										<IconButton
											icon="xmark"
											title={t(translation.Browser.HistoryRemove)}
											onClick={() => removeEntry(entry.id)}
											className="shrink-0 opacity-0 group-hover:opacity-100"
										/>
									</div>
								))}
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
