import clsx from "clsx";
import type { CSSProperties } from "react";

import { Typography } from "@/shared/typography";
import UiIcon, { type UiIconName } from "@/shared/ui/icons/UiIcon";
import { Tooltip } from "@/shared/ui/Tooltip";

interface SidebarNavItemProps {
	icon: UiIconName;
	color: string;
	label: string;
	description: string;
	/** The key combination that opens it, ready to show. */
	shortcut?: string;
	isActive: boolean;
	onClick: () => void;
}

/**
 * One row in the expanded drawer. The description lives only in the tooltip,
 * which also carries the label in full for Khmer and Chinese, where labels run
 * past the rail.
 */
export function SidebarNavItem({
	icon,
	color,
	label,
	description,
	shortcut,
	isActive,
	onClick,
}: Readonly<SidebarNavItemProps>) {
	return (
		<Tooltip
			side="right"
			content={
				<>
					<span className="block font-medium text-text">{label}</span>
					<span className="mt-0.5 block text-muted">{description}</span>
				</>
			}
		>
			<button
				type="button"
				onClick={onClick}
				aria-label={label}
				style={{ "--page": color } as CSSProperties}
				className={clsx(
					"group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
					"transition duration-300 ease-spring active:scale-96 active:duration-75 active:ease-out motion-reduce:transition-none motion-reduce:active:scale-100",
					"text-left text-sm",
					isActive
						? "bg-bg/60 text-text before:absolute before:inset-y-1.5 before:left-0 before:w-0.75 before:rounded-full before:bg-(--page)"
						: "text-muted hover:bg-bg/40 hover:text-text active:bg-bg/70",
				)}
			>
				<UiIcon
					name={icon}
					filled={isActive}
					className={clsx(
						"h-5 w-5 shrink-0 text-(--page)",
						"transition-transform duration-300 ease-spring group-active:scale-85 group-active:duration-75 group-active:ease-out motion-reduce:transition-none motion-reduce:group-active:scale-100",
					)}
				/>
				<Typography variant="body" className="min-w-0 truncate font-medium text-inherit">
					{label}
				</Typography>
				{shortcut && <kbd className="ml-auto shrink-0 font-sans text-xs text-muted">{shortcut}</kbd>}
			</button>
		</Tooltip>
	);
}
