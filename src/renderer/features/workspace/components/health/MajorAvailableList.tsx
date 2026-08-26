import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { OutdatedPackageInfo } from "@renderer/shared/types/lazify";
import { MonoText, OverlineText } from "@renderer/shared/typography";

/**
 * Packages already at the newest version their range allows. Listed for
 * awareness only — taking these means a deliberate major upgrade.
 */
export function MajorAvailableList({
	packages,
}: Readonly<{ packages: [string, OutdatedPackageInfo][] }>) {
	const { t } = useTranslation();

	return (
		<div className="rounded-[14px] border border-border bg-soft/40 px-3.5 py-2.5">
			<OverlineText className="text-muted">
				{t(translation.HealthPane.MajorAvailable, { count: packages.length })}
			</OverlineText>

			<div className="mt-2 grid gap-1">
				{packages.map(([name, info]) => (
					<div key={name} className="flex items-center gap-2 text-[11px]">
						<MonoText className="min-w-0 flex-1 truncate text-[11px] text-muted">{name}</MonoText>
						<MonoText as="span" className="shrink-0 text-[11px] text-muted/70">
							{info.current} → {info.latest}
						</MonoText>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Audit section ────────────────────────────────────────────────────────────
