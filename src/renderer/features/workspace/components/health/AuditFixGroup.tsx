import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AuditSeverity, AuditVulnerability } from "@renderer/shared/types/lazify";
import { MonoText, PillText } from "@renderer/shared/typography";

import { AuditSeverityPill } from "./audit-severity";
import { AuditVulnRow } from "./AuditVulnRow";

/** One upgrade decision, with the findings it would resolve underneath it. */
export function AuditFixGroup({
	target,
	vulns,
}: Readonly<{ target: string; vulns: AuditVulnerability[] }>) {
	const { t } = useTranslation();
	const worst = (["critical", "high", "moderate", "low", "info"] as AuditSeverity[]).find(
		(severity) => vulns.some((vuln) => vuln.severity === severity),
	);

	return (
		<div className="rounded-[14px] border border-border bg-soft/40 p-2.5">
			<div className="flex flex-wrap items-center gap-2">
				<MonoText className="min-w-0 flex-1 truncate text-[12px] font-semibold text-text">
					{target}
				</MonoText>
				{worst && <AuditSeverityPill severity={worst} />}
				<PillText as="span" className="shrink-0 text-[10px] text-muted">
					{t(translation.HealthPane.ClearsCount, { count: vulns.length })}
				</PillText>
			</div>

			<div className="mt-2 grid gap-1.5">
				{vulns.map((vuln) => (
					<AuditVulnRow key={vuln.name} vuln={vuln} />
				))}
			</div>
		</div>
	);
}
