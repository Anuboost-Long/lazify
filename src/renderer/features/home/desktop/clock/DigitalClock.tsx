import clsx from "clsx";

import type { TimeFormatId } from "@renderer/features/settings/components/settings-config";
import { formatTime } from "@renderer/shared/hooks/use-date-time-format";

import type { DesktopClockSize } from "../personalize/use-desktop-personalization";

const TIME_SIZE_CLASS: Record<DesktopClockSize, string> = {
	compact: "text-5xl",
	regular: "text-7xl lg:text-8xl",
	large: "text-8xl lg:text-9xl",
};

const SUFFIX_SIZE_CLASS: Record<DesktopClockSize, string> = {
	compact: "text-lg",
	regular: "text-2xl",
	large: "text-3xl",
};

interface DigitalClockProps {
	now: Date;
	timeFormat: TimeFormatId;
	size?: DesktopClockSize;
	className?: string;
}

export function DigitalClock({
	now,
	timeFormat,
	size = "regular",
	className,
}: Readonly<DigitalClockProps>) {
	const [time, suffix] = formatTime(now, timeFormat).split(" ");

	return (
		<div className={clsx("flex items-baseline justify-center gap-3", className)}>
			<span
				className={clsx(
					"font-display font-semibold tabular-nums text-text",
					TIME_SIZE_CLASS[size],
				)}
			>
				{time}
			</span>
			{suffix ? (
				<span
					className={clsx("font-display font-semibold text-muted", SUFFIX_SIZE_CLASS[size])}
				>
					{suffix}
				</span>
			) : null}
		</div>
	);
}
