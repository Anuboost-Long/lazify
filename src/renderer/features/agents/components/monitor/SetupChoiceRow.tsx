import clsx from "clsx";

import { BodyText, CaptionText, MonoText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

interface SetupChoiceRowProps {
	icon?: UiIconName;
	initial?: string;
	title: string;
	subtitle: string;
	mono?: boolean;
	emphasis?: boolean;
	onClick: () => void;
}

export function SetupChoiceRow({
	icon,
	initial,
	title,
	subtitle,
	mono = false,
	emphasis = false,
	onClick,
}: Readonly<SetupChoiceRowProps>) {
	const glyph = () => {
		if (initial) {
			return (
				<BodyText as="span" className="!text-inherit text-sm font-semibold uppercase">
					{initial}
				</BodyText>
			);
		}

		if (icon) return <UiIcon name={icon} className="h-[18px] w-[18px]" />;

		return null;
	};

	return (
		<button
			type="button"
			onClick={onClick}
			className={clsx(
				"group flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left",
				"border-border bg-bg transition-colors duration-150",
				"hover:border-accent/50 hover:bg-accent/[0.06]",
			)}
		>
			<div
				className={clsx(
					"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
					"transition-colors duration-150",
					emphasis
						? "border-accent/25 bg-accent/10 text-accent"
						: "border-border bg-soft text-muted group-hover:text-accent",
				)}
			>
				{glyph()}
			</div>

			<div className="min-w-0 flex-1">
				<BodyText className="truncate">{title}</BodyText>
				{mono ? (
					<MonoText as="span" className="mt-0.5 block truncate text-[10px] text-muted">
						{subtitle}
					</MonoText>
				) : (
					<CaptionText tone="muted" className="mt-0.5 block truncate">
						{subtitle}
					</CaptionText>
				)}
			</div>

			<UiIcon
				name="arrow-right"
				className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-accent"
			/>
		</button>
	);
}
