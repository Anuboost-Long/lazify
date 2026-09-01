import { useClockStyle } from "@renderer/shared/hooks/use-clock-style";
import { formatDate, useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";
import { BodyText } from "@renderer/shared/typography";

import { AnalogClock } from "./AnalogClock";
import { DigitalClock } from "./DigitalClock";
import { useNow } from "./use-now";

export function DesktopClock() {
	const now = useNow();
	const { clockStyle } = useClockStyle();
	const { dateFormat, timeFormat } = useDateTimeFormat();

	return (
		<div className="pointer-events-none flex select-none flex-col items-center gap-5">
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
