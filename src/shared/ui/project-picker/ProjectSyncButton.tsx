import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import UiIcon from "@/shared/ui/icons/UiIcon";
import { Tooltip } from "@/shared/ui/Tooltip";

interface ProjectSyncButtonProps {
	syncing: boolean;
	compact?: boolean;
	onClick: () => void;
}

export function ProjectSyncButton({ syncing, compact = false, onClick }: Readonly<ProjectSyncButtonProps>) {
	const { t } = useTranslation();
	const label = t(translation.Workspace.SyncProject);

	return (
		<Tooltip content={compact ? label : undefined} side="right">
			<button
				type="button"
				disabled={syncing}
				onClick={onClick}
				aria-label={compact ? label : undefined}
				className={clsx(
					"flex h-9 w-full items-center gap-2 rounded-lg",
					"text-sm font-medium text-muted",
					compact ? "justify-center" : "px-2.5",
					"transition-colors hover:bg-text/6 hover:text-text",
					"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
					"disabled:cursor-not-allowed disabled:opacity-60",
				)}
			>
				<UiIcon
					name={syncing ? "refresh-circle" : "plus"}
					className={clsx("h-4 w-4 shrink-0", syncing && "animate-spin motion-reduce:animate-none")}
				/>
				{compact ? null : <span className="truncate">{label}</span>}
			</button>
		</Tooltip>
	);
}
