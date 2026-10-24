import clsx from "clsx";

import DevIcon from "@/shared/ui/icons/DevIcon";
import UiIcon from "@/shared/ui/icons/UiIcon";

interface SourceOptionRowProps {
	icon: string;
	title: string;
	description: string;
	onSelect: () => void;
}

/** One stack or saved template in the source list; choosing it moves on to setup. */
export function SourceOptionRow({ icon, title, description, onSelect }: Readonly<SourceOptionRowProps>) {
	return (
		<li>
			<button
				type="button"
				onClick={onSelect}
				className={clsx(
					"group flex w-full items-center gap-4",
					"text-left",
					"px-4 py-3.5",
					"transition-colors duration-150 hover:bg-text/4",
					"focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
				)}
			>
				<span
					className={clsx(
						"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
						"bg-bg",
						"border border-border",
						"text-xl text-text",
					)}
				>
					<DevIcon name={icon} />
				</span>

				<span className="min-w-0 flex-1">
					<span className="block truncate text-sm font-semibold text-text">{title}</span>
					<span className="mt-0.5 block truncate text-xs text-muted">{description}</span>
				</span>

				<UiIcon
					name="arrow-right"
					className={clsx(
						"h-4 w-4 shrink-0",
						"text-muted",
						"transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent",
						"motion-reduce:transition-none motion-reduce:group-hover:translate-x-0",
					)}
				/>
			</button>
		</li>
	);
}
