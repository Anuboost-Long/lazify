import clsx from "clsx";
import type { CSSProperties } from "react";

import UiIcon, { type UiIconName } from "@/shared/ui/icons/UiIcon";
import { Tooltip } from "@/shared/ui/Tooltip";

interface SidebarMiniItemProps {
	icon: UiIconName;
	color: string;
	label: string;
	shortcut?: string;
	isActive: boolean;
	onClick: () => void;
}

/**
 * One icon in the collapsed rail, where the label is not merely truncated but
 * absent — so the tooltip is the only thing naming it.
 */
export function SidebarMiniItem({
	icon,
	color,
	label,
	shortcut,
	isActive,
	onClick,
}: Readonly<SidebarMiniItemProps>) {
	return (
		<Tooltip content={shortcut ? `${label}  ${shortcut}` : label} side="right">
			<button
				type="button"
				onClick={onClick}
				aria-label={label}
				style={{ "--page": color } as CSSProperties}
				className={clsx(
					"relative flex w-full items-center justify-center rounded-lg py-2.5",
					"text-left text-sm",
					isActive
						? "bg-bg/60 text-text before:absolute before:inset-y-1.5 before:left-0 before:w-0.75 before:rounded-full before:bg-(--page)"
						: "text-muted hover:bg-bg/40 hover:text-text",
				)}
			>
				<UiIcon name={icon} filled={isActive} className="h-5 w-5 shrink-0 text-(--page)" />
			</button>
		</Tooltip>
	);
}
