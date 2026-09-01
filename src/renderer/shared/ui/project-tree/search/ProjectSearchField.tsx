import clsx from "clsx";
import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import { fieldChromeClassName } from "@renderer/shared/ui/form/FormInput";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { SearchIconButton } from "./SearchIconButton";
import type { ProjectSearchOptions } from "./useProjectSearch";

interface ProjectSearchFieldProps {
	query: string;
	options: ProjectSearchOptions;
	detailsOpen: boolean;
	onQueryChange: (value: string) => void;
	onOptionChange: <TKey extends keyof ProjectSearchOptions>(
		key: TKey,
		value: ProjectSearchOptions[TKey],
	) => void;
	onToggleDetails: () => void;
	onSubmit: () => void;
}

const MODES = [
	{ key: "matchCase", glyph: "Aa", label: translation.ProjectSearch.MatchCase },
	{ key: "wholeWord", glyph: "ab", label: translation.ProjectSearch.WholeWord },
	{ key: "useRegex", glyph: ".*", label: translation.ProjectSearch.UseRegex },
] as const;

export const ProjectSearchField = forwardRef<HTMLInputElement, Readonly<ProjectSearchFieldProps>>(
	function ProjectSearchField(
		{ query, options, detailsOpen, onQueryChange, onOptionChange, onToggleDetails, onSubmit },
		ref,
	) {
		const { t } = useTranslation();

		return (
			<div className="flex items-center gap-1">
				<SearchIconButton
					label={t(
						detailsOpen ? translation.ProjectSearch.HideDetails : translation.ProjectSearch.ShowDetails,
					)}
					pressed={detailsOpen}
					onClick={onToggleDetails}
				>
					<UiIcon
						name="arrow-right"
						className={clsx("h-3.5 w-3.5 transition-transform", detailsOpen && "rotate-90")}
					/>
				</SearchIconButton>

				<div
					className={clsx(
						"flex min-w-0 flex-1 items-center gap-1.5",
						fieldChromeClassName("default", "sm"),
					)}
				>
					<UiIcon name="search" className="h-3.5 w-3.5 shrink-0 text-muted" />

					<input
						ref={ref}
						type="text"
						value={query}
						spellCheck={false}
						placeholder={t(translation.ProjectSearch.Placeholder)}
						aria-label={t(translation.ProjectSearch.Placeholder)}
						onChange={(event) => onQueryChange(event.target.value)}
						onKeyDown={(event) => {
							if (event.key !== "Enter") return;

							event.preventDefault();
							onSubmit();
						}}
						className={clsx(
							"min-w-0 flex-1 border-0 bg-transparent p-0",
							"font-mono text-xs text-text outline-none placeholder:text-muted",
						)}
					/>

					{MODES.map((mode) => (
						<SearchIconButton
							key={mode.key}
							label={t(mode.label)}
							pressed={options[mode.key]}
							onClick={() => onOptionChange(mode.key, !options[mode.key])}
						>
							<CaptionText as="span" tone="inherit" className="font-mono leading-none">
								{mode.glyph}
							</CaptionText>
						</SearchIconButton>
					))}
				</div>
			</div>
		);
	},
);
