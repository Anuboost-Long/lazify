import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { AuditVulnerability } from "@renderer/shared/types/lazify";
import { BodyText, MonoText, PillText } from "@renderer/shared/typography";

import { AuditSeverityPill, SEVERITY_ROW } from "./audit-severity";

export function AuditVulnRow({ vuln }: Readonly<{ vuln: AuditVulnerability }>) {
	const { t } = useTranslation();

	const isFixable =
		vuln.fixAvailable === true ||
		(typeof vuln.fixAvailable === "object" && !vuln.fixAvailable.isSemVerMajor);
	const isForceFixable = typeof vuln.fixAvailable === "object" && vuln.fixAvailable.isSemVerMajor;

	const firstVia = vuln.via[0];
	const title = typeof firstVia === "object" && "title" in firstVia ? firstVia.title : null;

	return (
		<div className={clsx("rounded-[14px] border px-3.5 py-2.5", SEVERITY_ROW[vuln.severity])}>
			<div className="flex items-start gap-2">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<MonoText className="text-[12px] font-semibold text-text">{vuln.name}</MonoText>
						<AuditSeverityPill severity={vuln.severity} />
						{(isFixable || isForceFixable) && (
							<PillText
								as="span"
								className={clsx(
									"rounded-full border px-2 py-0.5 text-[10px] font-semibold",
									isFixable
										? "border-accent/20 bg-accent/8 text-accent"
										: "border-warning/20 bg-warning/8 text-warning",
								)}
							>
								{t(translation.HealthPane.AuditFixable)}
								{isForceFixable && " (major)"}
							</PillText>
						)}
						{!vuln.fixAvailable && (
							<PillText as="span" className="text-[10px] text-muted">
								{t(translation.HealthPane.AuditNoFix)}
							</PillText>
						)}
					</div>
					{title && <BodyText className="mt-1 text-[11px] text-muted">{title}</BodyText>}
				</div>
			</div>
		</div>
	);
}

/** One upgrade decision, with the findings it would resolve underneath it. */
