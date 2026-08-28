import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import type { CardShellProps } from "./types";

export function ProjectCardCollapsed({
	project,
	active,
	running,
	waiting,
	isDragging,
	onSelect,
	dragProps,
	dropLine,
}: Readonly<CardShellProps>) {
	const { t } = useTranslation();

	const dotTone = () => {
		if (active) return "bg-accent";
		if (running > 0) return "bg-accent/40";

		return "bg-border";
	};

	return (
		<Tooltip content={project.projectPath} side="right">
			<button
				type="button"
				{...dragProps}
				onClick={() => onSelect(project.projectPath)}
				className={clsx(
					"relative flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left",
					"transition-colors cursor-grab active:cursor-grabbing",
					isDragging && "opacity-40",
					active ? "bg-text/[0.10]" : "hover:bg-text/[0.06]",
				)}
			>
				{dropLine}

				<span aria-hidden className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", dotTone())} />

				<SmallText className="!text-text min-w-0 flex-1 truncate">{project.projectName}</SmallText>

				{waiting > 0 ? (
					<span
						aria-label={t(translation.Agents.NeedsAttention)}
						className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent"
					/>
				) : null}
			</button>
		</Tooltip>
	);
}
