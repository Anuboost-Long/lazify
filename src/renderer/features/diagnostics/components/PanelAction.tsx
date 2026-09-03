import clsx from "clsx";

import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface PanelActionProps {
	label: string;
	icon: UiIconName;
	emphasis?: "primary" | "quiet" | "danger";
	disabled?: boolean;
	onClick: () => void;
}

const EMPHASIS = {
	primary: "border-accent bg-accent text-bg hover:bg-accentHover hover:border-accentHover",
	quiet: "border-border text-text hover:border-accent hover:text-accent",
	danger: "border-error/50 text-error hover:border-error hover:bg-error/10",
} as const;

export function PanelAction({
	label,
	icon,
	emphasis = "quiet",
	disabled,
	onClick,
}: Readonly<PanelActionProps>) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={clsx(
				"flex h-8 items-center gap-1.5 rounded-md border px-3",
				"text-xs font-medium transition-colors",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
				"disabled:cursor-not-allowed disabled:opacity-45",
				EMPHASIS[emphasis],
			)}
		>
			<UiIcon name={icon} className="h-3.5 w-3.5" />
			{label}
		</button>
	);
}
