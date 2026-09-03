import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ProjectButtonProps {
	projectName: string;
	onClick: () => void;
}

export function ProjectButton({ projectName, onClick }: Readonly<ProjectButtonProps>) {
	const { t } = useTranslation();

	return (
		<button
			type="button"
			onClick={onClick}
			className={clsx(
				"group flex h-8 min-w-0 max-w-[260px] items-center gap-2 rounded-md border border-border px-2.5",
				"text-left transition-colors hover:border-accent",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
			)}
		>
			<UiIcon name="folder" filled className="h-3.5 w-3.5 shrink-0 text-muted" />
			<span className="truncate text-xs font-medium text-text">
				{projectName || t(translation.Diagnostics.ChooseProject)}
			</span>
			<UiIcon
				name="arrow-right"
				className="h-3 w-3 shrink-0 rotate-90 text-muted transition-colors group-hover:text-accent"
			/>
		</button>
	);
}
