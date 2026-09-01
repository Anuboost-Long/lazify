import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ProjectSearchQuery, ProjectSearchResult } from "@main/projects/project-search/types";

const DEBOUNCE_MS = 250;

const EMPTY_RESULT: ProjectSearchResult = {
	files: [],
	fileCount: 0,
	matchCount: 0,
	truncated: false,
	error: null,
};

export type ProjectSearchOptions = Omit<ProjectSearchQuery, "query">;

const DEFAULT_OPTIONS: ProjectSearchOptions = {
	matchCase: false,
	wholeWord: false,
	useRegex: false,
	include: "",
	exclude: "",
	useIgnoreFiles: true,
};

export interface ProjectSearch {
	query: string;
	options: ProjectSearchOptions;
	result: ProjectSearchResult;
	searching: boolean;
	collapsedPaths: ReadonlySet<string>;
	allCollapsed: boolean;
	setQuery: (value: string) => void;
	setOption: <TKey extends keyof ProjectSearchOptions>(
		key: TKey,
		value: ProjectSearchOptions[TKey],
	) => void;
	toggleCollapsed: (relativePath: string) => void;
	toggleAllCollapsed: () => void;
	clear: () => void;
	refresh: () => void;
}

export function useProjectSearch(projectPath: string): ProjectSearch {
	const [query, setQuery] = useState("");
	const [options, setOptions] = useState<ProjectSearchOptions>(DEFAULT_OPTIONS);
	const [result, setResult] = useState<ProjectSearchResult>(EMPTY_RESULT);
	const [searching, setSearching] = useState(false);
	const [collapsedPaths, setCollapsedPaths] = useState<ReadonlySet<string>>(new Set());
	const [nonce, setNonce] = useState(0);
	const requestIdRef = useRef(0);

	useEffect(() => {
		setQuery("");
		setResult(EMPTY_RESULT);
		setCollapsedPaths(new Set());
	}, [projectPath]);

	useEffect(() => {
		if (query.length === 0) {
			requestIdRef.current += 1;
			setResult(EMPTY_RESULT);
			setSearching(false);
			return;
		}

		setSearching(true);

		const timer = setTimeout(() => {
			const requestId = requestIdRef.current + 1;
			requestIdRef.current = requestId;

			void globalThis.lazify
				.searchProject(projectPath, { query, ...options })
				.then((next) => {
					if (requestIdRef.current !== requestId) return;

					setResult(next);
					setCollapsedPaths(new Set());
					setSearching(false);
				})
				.catch(() => {
					if (requestIdRef.current !== requestId) return;

					setResult(EMPTY_RESULT);
					setSearching(false);
				});
		}, DEBOUNCE_MS);

		return () => clearTimeout(timer);
	}, [projectPath, query, options, nonce]);

	const setOption = useCallback(
		<TKey extends keyof ProjectSearchOptions>(key: TKey, value: ProjectSearchOptions[TKey]) =>
			setOptions((current) => ({ ...current, [key]: value })),
		[],
	);

	const toggleCollapsed = useCallback(
		(relativePath: string) =>
			setCollapsedPaths((current) => {
				const next = new Set(current);

				if (next.has(relativePath)) next.delete(relativePath);
				else next.add(relativePath);

				return next;
			}),
		[],
	);

	const allCollapsed = useMemo(
		() => result.files.length > 0 && collapsedPaths.size >= result.files.length,
		[collapsedPaths, result.files.length],
	);

	const toggleAllCollapsed = useCallback(
		() =>
			setCollapsedPaths((current) =>
				current.size >= result.files.length
					? new Set()
					: new Set(result.files.map((file) => file.relativePath)),
			),
		[result.files],
	);

	const clear = useCallback(() => setQuery(""), []);
	const refresh = useCallback(() => setNonce((current) => current + 1), []);

	return {
		query,
		options,
		result,
		searching,
		collapsedPaths,
		allCollapsed,
		setQuery,
		setOption,
		toggleCollapsed,
		toggleAllCollapsed,
		clear,
		refresh,
	};
}
