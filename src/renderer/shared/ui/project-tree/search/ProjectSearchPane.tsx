import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ProjectSearchFile, ProjectSearchMatch } from "@main/projects/project-search/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { ProjectSearchField } from "./ProjectSearchField";
import { ProjectSearchFileGroup } from "./ProjectSearchFileGroup";
import { ProjectSearchFilters } from "./ProjectSearchFilters";
import { SearchIconButton } from "./SearchIconButton";
import { useProjectSearch } from "./useProjectSearch";

interface ProjectSearchPaneProps {
	projectPath: string;
	activePath: string | null;
	focusNonce: number;
	onOpenMatch: (file: ProjectSearchFile, match: ProjectSearchMatch) => void;
}

export function ProjectSearchPane({
	projectPath,
	activePath,
	focusNonce,
	onOpenMatch,
}: Readonly<ProjectSearchPaneProps>) {
	const { t } = useTranslation();
	const search = useProjectSearch(projectPath);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (focusNonce === 0) return;

		inputRef.current?.focus();
		inputRef.current?.select();
	}, [focusNonce]);

	const { error, files, fileCount, matchCount, truncated } = search.result;

	const summary = () => {
		if (error) return t(translation.ProjectSearch.InvalidPattern);
		if (search.searching) return t(translation.ProjectSearch.Searching);
		if (matchCount === 0) return t(translation.ProjectSearch.NoResults);
		if (matchCount === 1 && fileCount === 1) {
			return t(translation.ProjectSearch.OneResultSummary);
		}

		return t(translation.ProjectSearch.ResultsSummary, {
			matches: matchCount,
			files: fileCount,
		});
	};

	const body = () => {
		if (search.query.length === 0) {
			return <PaneNote text={t(translation.ProjectSearch.StartTyping)} />;
		}

		if (error || search.searching) return null;

		if (files.length === 0) {
			return <PaneNote text={t(translation.ProjectSearch.NoResultsHint)} />;
		}

		return (
			<>
				{files.map((file) => (
					<ProjectSearchFileGroup
						key={file.relativePath}
						file={file}
						collapsed={search.collapsedPaths.has(file.relativePath)}
						activePath={activePath}
						onToggle={search.toggleCollapsed}
						onOpenMatch={onOpenMatch}
					/>
				))}

				{truncated ? <PaneNote text={t(translation.ProjectSearch.Truncated)} /> : null}
			</>
		);
	};

	return (
		<div className="flex h-full flex-col overflow-hidden bg-bg">
			<div className="shrink-0 border-b border-border px-3 py-2.5">
				<ProjectSearchField
					ref={inputRef}
					query={search.query}
					options={search.options}
					detailsOpen={detailsOpen}
					onQueryChange={search.setQuery}
					onOptionChange={search.setOption}
					onToggleDetails={() => setDetailsOpen((current) => !current)}
					onSubmit={search.refresh}
				/>

				{detailsOpen ? (
					<ProjectSearchFilters options={search.options} onOptionChange={search.setOption} />
				) : null}
			</div>

			{search.query.length > 0 ? (
				<div className="flex shrink-0 items-center gap-2 px-3 pb-1 pt-2">
					<CaptionText
						as="p"
						tone={error ? "error" : "muted"}
						className="min-w-0 flex-1 truncate"
						aria-live="polite"
					>
						{summary()}
					</CaptionText>

					<div className="flex shrink-0 items-center gap-0.5">
						<SearchIconButton label={t(translation.ProjectSearch.Refresh)} onClick={search.refresh}>
							<UiIcon name="refresh-circle" className="h-3.5 w-3.5" />
						</SearchIconButton>
						<SearchIconButton
							label={t(
								search.allCollapsed
									? translation.ProjectSearch.ExpandAll
									: translation.ProjectSearch.CollapseAll,
							)}
							disabled={files.length === 0}
							onClick={search.toggleAllCollapsed}
						>
							<UiIcon name={search.allCollapsed ? "expand" : "collapse"} className="h-3.5 w-3.5" />
						</SearchIconButton>
						<SearchIconButton label={t(translation.ProjectSearch.Clear)} onClick={search.clear}>
							<UiIcon name="xmark" className="h-3.5 w-3.5" />
						</SearchIconButton>
					</div>
				</div>
			) : null}

			<div className="min-h-0 flex-1 overflow-y-auto pb-2">{body()}</div>
		</div>
	);
}

function PaneNote({ text }: Readonly<{ text: string }>) {
	return (
		<CaptionText as="p" tone="muted" className="px-4 py-8 text-center leading-5">
			{text}
		</CaptionText>
	);
}
