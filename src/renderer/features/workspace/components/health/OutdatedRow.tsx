import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { OutdatedPackageInfo } from "@renderer/shared/types/lazify";
import { MonoText } from "@renderer/shared/typography";

export function OutdatedRow({
	name,
	info,
}: Readonly<{
	name: string;
	info: OutdatedPackageInfo;
}>) {
	const { t } = useTranslation();
	// Only worth mentioning: a major exists beyond the update we are asking for.
	const hasNewerMajor = info.latest && info.latest !== info.wanted;

	return (
		<div className="rounded-[14px] border border-warning/20 bg-warning/5 px-3.5 py-2.5">
			<MonoText className="block truncate text-[12px] font-semibold text-text">{name}</MonoText>

			<div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
				<span>
					{t(translation.HealthPane.OutdatedCurrent)}&nbsp;
					<MonoText as="span" className="text-[11px] text-text">
						{info.current}
					</MonoText>
				</span>
				<span className="text-muted/40">→</span>
				<span>
					{t(translation.HealthPane.OutdatedWanted)}&nbsp;
					<MonoText as="span" className="text-[11px] font-semibold text-accent">
						{info.wanted}
					</MonoText>
				</span>
				{hasNewerMajor && (
					<>
						<span className="text-muted/40">·</span>
						<span className="text-muted/70">
							{t(translation.HealthPane.OutdatedLatest)}&nbsp;
							<MonoText as="span" className="text-[11px] text-muted">
								{info.latest}
							</MonoText>
						</span>
					</>
				)}
			</div>
		</div>
	);
}

/** A package can carry a dozen advisories; enough to identify it, not all of them. */
