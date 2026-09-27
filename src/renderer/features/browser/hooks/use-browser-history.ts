import { atom, useAtom } from "jotai";
import { useCallback } from "react";

import { uniqueId } from "@renderer/shared/lib/unique-id";

/**
 * The browser's visited-pages log, independent of the tab strip.
 *
 * Closing a tab already drops it from `use-browser-tabs`; this is the record
 * that survives that, and the restart after it, so "where was that page
 * again" has an answer. It is capped rather than pruned by age, since a
 * history nobody can search through is not much of one.
 */

const HISTORY_KEY = "lazify-browser-history";
const MAX_ENTRIES = 500;

export interface HistoryEntry {
	id: string;
	url: string;
	title: string;
	visitedAt: number;
}

function readStoredHistory(): HistoryEntry[] {
	try {
		const raw = globalThis.localStorage.getItem(HISTORY_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as HistoryEntry[];
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(entry) => typeof entry?.url === "string" && typeof entry?.visitedAt === "number",
		);
	} catch {
		return [];
	}
}

function persist(entries: HistoryEntry[]) {
	globalThis.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

const historyAtom = atom<HistoryEntry[]>(readStoredHistory());

export function useBrowserHistory() {
	const [history, setHistory] = useAtom(historyAtom);

	/**
	 * Logs a visit, newest first.
	 *
	 * A navigation and the title that follows it fire as two separate events
	 * for the same page load (see BrowserGuest), so this only opens a new entry
	 * when the address actually changed from the one on top — otherwise it
	 * fills in the title the first call did not have yet, in place.
	 */
	const recordVisit = useCallback(
		(url: string, title: string) => {
			if (!url || url === "about:blank") return;

			setHistory((current) => {
				const [mostRecent, ...rest] = current;
				const next =
					mostRecent && mostRecent.url === url
						? [{ ...mostRecent, title: title || mostRecent.title, visitedAt: Date.now() }, ...rest]
						: [{ id: uniqueId("visit"), url, title, visitedAt: Date.now() }, ...current].slice(
								0,
								MAX_ENTRIES,
							);
				persist(next);
				return next;
			});
		},
		[setHistory],
	);

	const removeEntry = useCallback(
		(id: string) => {
			setHistory((current) => {
				const next = current.filter((entry) => entry.id !== id);
				persist(next);
				return next;
			});
		},
		[setHistory],
	);

	const clearHistory = useCallback(() => {
		persist([]);
		setHistory([]);
	}, [setHistory]);

	return { history, recordVisit, removeEntry, clearHistory };
}
