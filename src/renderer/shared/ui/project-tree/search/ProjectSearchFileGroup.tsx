import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { ProjectSearchFile, ProjectSearchMatch } from "@main/projects/project-search/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, MonoText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { getFileVisual } from "@renderer/shared/ui/project-tree/core/project-tree-visuals";

interface ProjectSearchFileGroupProps {
	file: ProjectSearchFile;
	collapsed: boolean;
	activePath: string | null;
	onToggle: (relativePath: string) => void;
	onOpenMatch: (file: ProjectSearchFile, match: ProjectSearchMatch) => void;
}

export function ProjectSearchFileGroup({
	file,
	collapsed,
	activePath,
	onToggle,
	onOpenMatch,
}: Readonly<ProjectSearchFileGroupProps>) {
	const { t } = useTranslation();
	const visual = getFileVisual(file.name);
	const open = activePath === file.absolutePath;
	const countable = collapsed || file.matches.length > 1;

	return (
		<div>
			<button
				type="button"
				onClick={() => onToggle(file.relativePath)}
				aria-expanded={!collapsed}
				className={clsx(
					"flex w-full items-center gap-1.5 py-1.5 pl-2 pr-3 text-left",
					open ? "bg-accent/5" : "bg-transparent",
					"transition-colors hover:bg-text/5",
					"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accentSoft",
				)}
			>
				<UiIcon
					name="arrow-right"
					className={clsx("h-3 w-3 shrink-0 text-muted transition-transform", !collapsed && "rotate-90")}
				/>
				<UiIcon name={visual.icon} className={clsx("h-3.5 w-3.5 shrink-0", visual.color)} />
				<SmallText as="span" className="shrink-0 truncate !text-text">
					{file.name}
				</SmallText>
				<CaptionText as="span" tone="muted" className="min-w-0 flex-1 truncate">
					{file.directory}
				</CaptionText>
				{countable ? (
					<CaptionText
						as="span"
						tone="muted"
						className="shrink-0 rounded-full bg-text/10 px-1.5 tabular-nums"
					>
						{file.matches.length}
					</CaptionText>
				) : null}
			</button>

			{collapsed
				? null
				: file.matches.map((match, index) => (
						<button
							key={`${match.line}-${index}`}
							type="button"
							onClick={() => onOpenMatch(file, match)}
							aria-label={t(translation.ProjectSearch.OpenMatch, {
								file: file.name,
								line: match.line,
							})}
							className={clsx(
								"block w-full py-1 pl-11 pr-3 text-left",
								"transition-colors hover:bg-text/5",
								"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accentSoft",
							)}
						>
							<MonoText as="span" className="block truncate">
								{match.preview.slice(0, match.start)}
								<mark className="rounded-sm bg-warning/30 text-text">
									{match.preview.slice(match.start, match.end)}
								</mark>
								{match.preview.slice(match.end)}
							</MonoText>
						</button>
					))}
		</div>
	);
}
