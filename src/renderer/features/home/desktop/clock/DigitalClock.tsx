import clsx from "clsx";

import type { TimeFormatId } from "@renderer/features/settings/components/settings-config";
import { formatTime } from "@renderer/shared/hooks/use-date-time-format";

interface DigitalClockProps {
	now: Date;
	timeFormat: TimeFormatId;
	className?: string;
}

export function DigitalClock({ now, timeFormat, className }: Readonly<DigitalClockProps>) {
	const [time, suffix] = formatTime(now, timeFormat).split(" ");

	return (
		<div className={clsx("flex items-baseline justify-center gap-3", className)}>
			<span className="font-display text-7xl font-semibold tabular-nums text-text lg:text-8xl">
				{time}
			</span>
			{suffix ? (
				<span className="font-display text-2xl font-semibold text-muted">{suffix}</span>
			) : null}
		</div>
	);
}
