import clsx from "clsx";

import { useClockStyle } from "@renderer/shared/hooks/use-clock-style";
import { formatDate, useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";
import { BodyText } from "@renderer/shared/typography";

import { AnalogClock } from "./AnalogClock";
import { DigitalClock } from "./DigitalClock";
import { useNow } from "./use-now";

export function DesktopClock({ dimmed }: Readonly<{ dimmed: boolean }>) {
	const now = useNow();
	const { clockStyle } = useClockStyle();
	const { dateFormat, timeFormat } = useDateTimeFormat();

	return (
		<div
			className={clsx(
				"pointer-events-none flex select-none flex-col items-center gap-5",
				"transition-opacity duration-500",
				dimmed ? "opacity-25" : "opacity-100",
			)}
		>
			{clockStyle !== "digital" ? (
				<AnalogClock now={now} className="h-44 w-44 lg:h-52 lg:w-52" />
			) : null}

			{clockStyle !== "analog" ? <DigitalClock now={now} timeFormat={timeFormat} /> : null}

			<BodyText tone="muted" className="text-base tracking-wide">
				{formatDate(now, dateFormat)}
			</BodyText>
		</div>
	);
}
