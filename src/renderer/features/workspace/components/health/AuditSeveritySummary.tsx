import clsx from "clsx";
import { useTranslation } from "react-i18next";

import type { AuditSeverity, NpmAuditResult } from "@renderer/shared/types/lazify";
import { PillText } from "@renderer/shared/typography";

import { SEVERITY_LABEL, SEVERITY_PILL } from "./audit-severity";

export function AuditSeveritySummary({
	counts,
}: Readonly<{ counts: NpmAuditResult["metadata"]["vulnerabilities"] }>) {
	const { t } = useTranslation();
	const severities: AuditSeverity[] = ["critical", "high", "moderate", "low", "info"];
	const active = severities.filter((s) => counts[s] > 0);
	if (active.length === 0) return null;

	return (
		<div className="flex flex-wrap gap-1.5">
			{active.map((s) => (
				<PillText
					key={s}
					as="span"
					className={clsx(
						"rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
						SEVERITY_PILL[s],
					)}
				>
					{counts[s]} {t(SEVERITY_LABEL[s])}
				</PillText>
			))}
		</div>
	);
}

// ─── Loading / error placeholders ────────────────────────────────────────────
