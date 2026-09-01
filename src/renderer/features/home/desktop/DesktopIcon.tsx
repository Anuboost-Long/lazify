import clsx from "clsx";

import { CaptionText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface DesktopIconProps {
	label: string;
	icon: UiIconName;
	active: boolean;
	onOpen: () => void;
}

export function DesktopIcon({ label, icon, active, onOpen }: Readonly<DesktopIconProps>) {
	return (
		<button
			type="button"
			onClick={onOpen}
			aria-pressed={active}
			className={clsx(
				"group flex w-24 flex-col items-center gap-2 rounded-xl px-2 py-3",
				"transition-colors hover:bg-text/5",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft",
			)}
		>
			<span
				className={clsx(
					"flex h-12 w-12 items-center justify-center rounded-[14px] border transition-colors",
					active
						? "border-accent/40 bg-accent/10 text-accent"
						: "border-border bg-soft text-muted group-hover:border-accent/30 group-hover:text-text",
				)}
			>
				<UiIcon name={icon} filled={active} className="h-5 w-5" />
			</span>
			<CaptionText as="span" className="w-full truncate text-center !text-text">
				{label}
			</CaptionText>
		</button>
	);
}
