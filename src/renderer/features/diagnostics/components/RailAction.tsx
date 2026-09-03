import clsx from "clsx";

import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface RailActionProps {
	icon: UiIconName;
	label: string;
	disabled?: boolean;
	onClick: () => void;
}

export function RailAction({ icon, label, disabled, onClick }: Readonly<RailActionProps>) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={label}
			className={clsx(
				"rounded p-1 text-muted transition-colors",
				"hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
				"disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted",
			)}
		>
			<UiIcon name={icon} className="h-3.5 w-3.5" />
		</button>
	);
}
