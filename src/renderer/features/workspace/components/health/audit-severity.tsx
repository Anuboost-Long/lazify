import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AuditSeverity } from "@renderer/shared/types/lazify";
import { PillText } from "@renderer/shared/typography";

export const SEVERITY_PILL: Record<AuditSeverity, string> = {
	critical: "border-error/25 bg-error/10 text-error",
	high: "border-warning/30 bg-warning/12 text-warning",
	moderate: "border-warning/20 bg-warning/6 text-warning",
	low: "border-border bg-soft text-muted",
	info: "border-border bg-soft text-muted",
};

export const SEVERITY_ROW: Record<AuditSeverity, string> = {
	critical: "border-error/15 bg-error/5",
	high: "border-warning/20 bg-warning/5",
	moderate: "border-border bg-soft/40",
	low: "border-border bg-soft/40",
	info: "border-border bg-soft/20",
};

export const SEVERITY_LABEL: Record<AuditSeverity, string> = {
	critical: translation.HealthPane.AuditCritical,
	high: translation.HealthPane.AuditHigh,
	moderate: translation.HealthPane.AuditModerate,
	low: translation.HealthPane.AuditLow,
	info: translation.HealthPane.AuditInfo,
};

// ─── Outdated section ─────────────────────────────────────────────────────────

export function AuditSeverityPill({ severity }: Readonly<{ severity: AuditSeverity }>) {
	const { t } = useTranslation();
	return (
		<PillText
			as="span"
			className={clsx(
				"shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
				SEVERITY_PILL[severity],
			)}
		>
			{t(SEVERITY_LABEL[severity])}
		</PillText>
	);
}
