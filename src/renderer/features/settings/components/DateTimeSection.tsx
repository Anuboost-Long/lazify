import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { useClockStyle } from "@renderer/shared/hooks/use-clock-style";
import { useDateTimeFormat } from "@renderer/shared/hooks/use-date-time-format";

import { SectionLabel } from "./SectionLabel";
import { SelectChip } from "./SelectChip";
import { SettingRow } from "./SettingRow";
import type { ClockStyleId, DateFormatId, TimeFormatId } from "./settings-config";
import { CLOCK_STYLE_OPTIONS, DATE_FORMAT_OPTIONS, TIME_FORMAT_OPTIONS } from "./settings-config";

export function DateTimeSection() {
	const { t } = useTranslation();
	const { dateFormat, setDateFormat, timeFormat, setTimeFormat } = useDateTimeFormat();
	const { clockStyle, setClockStyle } = useClockStyle();

	return (
		<div className="border-t border-border pt-6">
			<SectionLabel>{t(translation.Settings.DateTime)}</SectionLabel>
			<div className={clsx("rounded-2xl border border-border bg-soft", "divide-y divide-border")}>
				<div className="px-5">
					<SettingRow
						label={t(translation.Settings.DateFormat)}
						description={t(translation.Settings.DateFormatDesc)}
					>
						<SelectChip
							options={DATE_FORMAT_OPTIONS}
							value={dateFormat}
							onChange={(id) => setDateFormat(id as DateFormatId)}
						/>
					</SettingRow>
				</div>
				<div className="px-5">
					<SettingRow
						label={t(translation.Settings.TimeFormat)}
						description={t(translation.Settings.TimeFormatDesc)}
					>
						<SelectChip
							options={TIME_FORMAT_OPTIONS}
							value={timeFormat}
							onChange={(id) => setTimeFormat(id as TimeFormatId)}
						/>
					</SettingRow>
				</div>
				<div className="px-5">
					<SettingRow
						label={t(translation.Settings.ClockStyle)}
						description={t(translation.Settings.ClockStyleDesc)}
					>
						<SelectChip
							options={CLOCK_STYLE_OPTIONS}
							value={clockStyle}
							onChange={(id) => setClockStyle(id as ClockStyleId)}
						/>
					</SettingRow>
				</div>
			</div>
		</div>
	);
}
