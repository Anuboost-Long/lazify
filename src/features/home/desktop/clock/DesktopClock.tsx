import { useTranslation } from "react-i18next";

import type { TimeFormatId } from "@/features/settings/components/settings-config";
import { translation } from "@/i18n/translation";
import { useClockStyle } from "@/shared/hooks/use-clock-style";
import { formatDate, useDateTimeFormat } from "@/shared/hooks/use-date-time-format";
import { BodyText } from "@/shared/typography";

import type { DesktopClockSize } from "../personalize/use-desktop-personalization";
import { AnalogClock } from "./AnalogClock";
import { DigitalClock } from "./DigitalClock";
import { useNow } from "./use-now";

const ANALOG_SIZE_CLASS: Record<DesktopClockSize, string> = {
	compact: "h-32 w-32",
	regular: "h-44 w-44 lg:h-52 lg:w-52",
	large: "h-56 w-56 lg:h-72 lg:w-72",
};

interface DesktopClockProps {
	size: DesktopClockSize;
	greeting: boolean;
	name: string;
	secondZone: string | null;
}

function greetingKey(hour: number, named: boolean) {
	if (hour >= 5 && hour < 12)
		return named ? translation.Home.GreetingMorningName : translation.Home.GreetingMorning;
	if (hour >= 12 && hour < 18)
		return named ? translation.Home.GreetingAfternoonName : translation.Home.GreetingAfternoon;
	return named ? translation.Home.GreetingEveningName : translation.Home.GreetingEvening;
}

export function zoneCity(zone: string) {
	return (zone.split("/").at(-1) ?? zone).replace(/_/g, " ");
}

function formatZoneTime(now: Date, zone: string, timeFormat: TimeFormatId) {
	return new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
		hour12: timeFormat === "12h",
		timeZone: zone,
	}).format(now);
}

export function DesktopClock({ size, greeting, name, secondZone }: Readonly<DesktopClockProps>) {
	const { t } = useTranslation();
	const now = useNow();
	const { clockStyle } = useClockStyle();
	const { dateFormat, timeFormat } = useDateTimeFormat();
	const trimmedName = name.trim();

	return (
		<div className="pointer-events-none flex select-none flex-col items-center gap-4">
			{greeting ? (
				<BodyText className="text-lg font-medium tracking-wide">
					{t(greetingKey(now.getHours(), trimmedName !== ""), { name: trimmedName })}
				</BodyText>
			) : null}

			{/* Side by side when both show: stacked, they took most of the screen's height. */}
			<div className="flex items-center gap-10">
				{clockStyle !== "digital" ? (
					<AnalogClock now={now} className={ANALOG_SIZE_CLASS[size]} />
				) : null}

				{clockStyle !== "analog" ? (
					<DigitalClock now={now} timeFormat={timeFormat} size={size} />
				) : null}
			</div>

			<BodyText tone="muted" className="text-base tracking-wide">
				{formatDate(now, dateFormat)}
				{secondZone ? (
					<span className="tabular-nums">
						{" · "}
						{zoneCity(secondZone)} {formatZoneTime(now, secondZone, timeFormat)}
					</span>
				) : null}
			</BodyText>
		</div>
	);
}
