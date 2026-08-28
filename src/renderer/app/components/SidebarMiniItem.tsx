import clsx from "clsx";

import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

interface SidebarMiniItemProps {
	icon: UiIconName;
	label: string;
	isActive: boolean;
	onClick: () => void;
}

/**
 * One icon in the collapsed rail, where the label is not merely truncated but
 * absent — so the tooltip is the only thing naming it.
 */
export function SidebarMiniItem({
	icon,
	label,
	isActive,
	onClick,
}: Readonly<SidebarMiniItemProps>) {
	return (
		<Tooltip content={label} side="right">
			<button
				type="button"
				onClick={onClick}
				aria-label={label}
				className={clsx(
					"flex w-full items-center justify-center rounded-xl py-3",
					"text-left text-sm",
					isActive ? "bg-bg text-text" : "text-muted hover:bg-bg/70 hover:text-text",
				)}
			>
				<UiIcon
					name={icon}
					filled={isActive}
					className={clsx("h-5 w-5 shrink-0", isActive ? "text-accent" : "text-muted")}
				/>
			</button>
		</Tooltip>
	);
}
