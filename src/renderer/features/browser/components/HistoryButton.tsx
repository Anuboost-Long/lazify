import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatDate, formatTime, useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useBrowserHistory, type HistoryEntry } from "../hooks/use-browser-history";
import { tabLabel } from "../lib/browser-url";

interface HistoryButtonProps {
	/** Opens the entry's address as a new tab. */
	onOpenUrl: (url: string) => void;
	/** Opens (or switches to) the full history tab. */
	onExpand: () => void;
}

/** The browser's visited-pages log, behind a toolbar button. */
export function HistoryButton({ onOpenUrl, onExpand }: Readonly<HistoryButtonProps>) {
	const { t } = useTranslation();
	const { dateFormat, timeFormat } = useDateTimeFormat();
	const { history, removeEntry, clearHistory } = useBrowserHistory();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const rootRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;

		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	useEffect(() => {
		if (!open) setQuery("");
	}, [open]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return history;
		return history.filter(
			(entry) =>
				entry.title.toLowerCase().includes(needle) || entry.url.toLowerCase().includes(needle),
		);
	}, [history, query]);

	const when = (entry: HistoryEntry) => {
		const visited = new Date(entry.visitedAt);
		const isToday = visited.toDateString() === new Date().toDateString();
		return isToday
			? formatTime(visited, timeFormat)
			: `${formatDate(visited, dateFormat)} ${formatTime(visited, timeFormat)}`;
	};

	const openEntry = (entry: HistoryEntry) => {
		onOpenUrl(entry.url);
		setOpen(false);
	};

	return (
		<div ref={rootRef} className="relative shrink-0">
			<Tooltip content={t(translation.Browser.History)} side="bottom">
				<button
					type="button"
					onClick={() => setOpen((current) => !current)}
					aria-label={t(translation.Browser.History)}
					aria-expanded={open}
					className={clsx(
						"flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
						"text-text hover:bg-text/[0.06]",
						open && "bg-text/[0.08]",
					)}
				>
					<UiIcon name="history" className="h-3.5 w-3.5" />
				</button>
			</Tooltip>

			{open ? (
				<div
					className={clsx(
						"absolute left-0 top-9 z-30 w-80 overflow-hidden rounded-2xl",
						"border border-border bg-bg shadow-panel",
					)}
				>
					<div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
						<UiIcon name="search" className="h-3.5 w-3.5 shrink-0 text-muted" />
						<input
							autoFocus
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder={t(translation.Browser.HistorySearchPlaceholder)}
							aria-label={t(translation.Browser.HistorySearchPlaceholder)}
							spellCheck={false}
							className={clsx(
								"min-w-0 flex-1 bg-transparent text-[12px] text-text outline-none",
								"placeholder:text-muted",
							)}
						/>
						<IconButton
							icon="expand"
							title={t(translation.Browser.HistoryExpand)}
							onClick={() => {
								setOpen(false);
								onExpand();
							}}
						/>
						{history.length > 0 ? (
							<IconButton
								icon="trash"
								title={t(translation.Browser.HistoryClear)}
								onClick={clearHistory}
							/>
						) : null}
					</div>

					{filtered.length === 0 ? (
						<CaptionText tone="muted" className="block px-4 py-3">
							{t(
								history.length === 0
									? translation.Browser.HistoryEmpty
									: translation.Browser.HistoryNoResults,
							)}
						</CaptionText>
					) : (
						<div className="max-h-80 overflow-y-auto py-1">
							{filtered.map((entry) => (
								<div
									key={entry.id}
									className="group flex items-center gap-2 px-3 py-1.5 hover:bg-text/[0.06]"
								>
									<UiIcon name="globe" className="h-3.5 w-3.5 shrink-0 text-muted" />
									<button
										type="button"
										onClick={() => openEntry(entry)}
										className="min-w-0 flex-1 text-left"
									>
										<SmallText className="!text-text block truncate">
											{entry.title || tabLabel(entry.url)}
										</SmallText>
										<CaptionText tone="muted" className="block truncate !text-[10px]">
											{when(entry)} · {entry.url}
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
					)}
				</div>
			) : null}
		</div>
	);
}
