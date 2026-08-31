import clsx from "clsx";
import type { ReactNode } from "react";

import { Tooltip } from "@renderer/shared/ui/Tooltip";

interface SearchIconButtonProps {
	label: string;
	pressed?: boolean;
	disabled?: boolean;
	onClick: () => void;
	children: ReactNode;
}

export function SearchIconButton({
	label,
	pressed,
	disabled = false,
	onClick,
	children,
}: Readonly<SearchIconButtonProps>) {
	return (
		<Tooltip content={label} side="bottom">
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				aria-label={label}
				aria-pressed={pressed}
				className={clsx(
					"flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
					pressed ? "bg-accent/10" : "bg-transparent",
					pressed ? "text-accent" : "text-muted",
					"transition-colors",
					!disabled && !pressed && "hover:bg-text/10 hover:text-text",
					disabled && "cursor-not-allowed opacity-40",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentSoft",
				)}
			>
				{children}
			</button>
		</Tooltip>
	);
}
