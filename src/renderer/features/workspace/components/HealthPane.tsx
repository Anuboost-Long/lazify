import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type {
	AuditSeverity,
	NpmAuditResult,
	NpmOutdatedResult,
} from "@renderer/shared/types/lazify";
import { BodyText, PillText } from "@renderer/shared/typography";
import { CopyButton } from "@renderer/shared/ui/CopyButton";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { TabBar, TabPanel } from "@renderer/shared/ui/tabs/TabBar";
import type { TabItem } from "@renderer/shared/ui/tabs/TabBar";

import { buildAuditMarkdown, buildUpgradeMarkdown, groupByFix } from "./health/audit-markdown";
import { AuditFixGroup } from "./health/AuditFixGroup";
import { AuditSeveritySummary } from "./health/AuditSeveritySummary";
import {
	SCORE_ICON,
	SCORE_LABEL,
	SCORE_STYLES,
	computeScore,
	isBehindRange,
} from "./health/health-score";
import { MajorAvailableList } from "./health/MajorAvailableList";
import { OutdatedRow } from "./health/OutdatedRow";
import { SectionEmpty } from "./health/SectionEmpty";

interface HealthPaneProps {
	projectPath: string;
}

type HealthTab = "outdated" | "audit";

interface SectionLoading {
	outdated: boolean;
	audit: boolean;
}

/** The outdated tab's badge: nothing until the check has run, then a count. */
function OutdatedPill({ checked, count }: Readonly<{ checked: boolean; count: number }>) {
	const { t } = useTranslation();

	if (!checked) return null;

	if (count === 0) {
		return (
			<PillText
				as="span"
				className="rounded-full border border-accent/20 bg-accent/8 px-2.5 py-0.5 text-[10px] font-semibold text-accent"
			>
				{t(translation.HealthPane.OutdatedNone)}
			</PillText>
		);
	}

	return (
		<PillText
			as="span"
			className="rounded-full border border-warning/25 bg-warning/10 px-2.5 py-0.5 text-[10px] font-semibold text-warning"
		>
			{t(
				count === 1
					? translation.HealthPane.OutdatedCountOne
					: translation.HealthPane.OutdatedCountOther,
				{ count },
			)}
		</PillText>
	);
}

/** The audit tab's badge, red only when something critical is in the list. */
function AuditPill({
	checked,
	count,
	criticalCount,
}: Readonly<{ checked: boolean; count: number; criticalCount: number }>) {
	const { t } = useTranslation();

	if (!checked) return null;

	if (count === 0) {
		return (
			<PillText
				as="span"
				className="rounded-full border border-accent/20 bg-accent/8 px-2.5 py-0.5 text-[10px] font-semibold text-accent"
			>
				{t(translation.HealthPane.AuditClean)}
			</PillText>
		);
	}

	return (
		<PillText
			as="span"
			className={clsx(
				"rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
				criticalCount > 0
					? "border-error/25 bg-error/10 text-error"
					: "border-warning/25 bg-warning/10 text-warning",
			)}
		>
			{t(count === 1 ? translation.HealthPane.AuditCountOne : translation.HealthPane.AuditCountOther, {
				count,
			})}
		</PillText>
	);
}

type AuditVulnerability = NpmAuditResult["vulnerabilities"][string];

/** The audit tab's body: still running, nothing found, or the findings. */
function AuditFindings({
	checked,
	vulns,
	counts,
	groups,
}: Readonly<{
	checked: boolean;
	vulns: AuditVulnerability[];
	counts: NpmAuditResult["metadata"]["vulnerabilities"] | undefined;
	groups: ReturnType<typeof groupByFix>;
}>) {
	const { t } = useTranslation();

	if (!checked) return <SectionEmpty message={t(translation.HealthPane.Loading)} />;
	if (vulns.length === 0) return <SectionEmpty message={t(translation.HealthPane.AuditClean)} />;

	return (
		<>
			{/* Same affordance as the package list: hand the findings to
          an agent instead of retyping them. */}
			<div className="flex items-center gap-2">
				{counts && <AuditSeveritySummary counts={counts} />}
				<CopyButton
					className="ml-auto"
					value={() => buildAuditMarkdown(vulns, counts)}
					label={t(translation.HealthPane.CopyForAgent)}
					copiedLabel={t(translation.HealthPane.CopiedForAgent)}
				/>
			</div>
			<div className="grid gap-2">
				{groups.map((group) => (
					<AuditFixGroup key={group.target} target={group.target} vulns={group.list} />
				))}
			</div>
		</>
	);
}

export function HealthPane({ projectPath }: Readonly<HealthPaneProps>) {
	const { t } = useTranslation();

	const [outdated, setOutdated] = useState<NpmOutdatedResult | null>(null);
	const [audit, setAudit] = useState<NpmAuditResult | null>(null);

	const [loading, setLoading] = useState<SectionLoading>({ outdated: false, audit: false });
	const [activeTab, setActiveTab] = useState<HealthTab>("outdated");
	const [lastChecked, setLastChecked] = useState<Date | null>(null);

	const runChecks = useCallback(async () => {
		setLoading({ outdated: true, audit: true });

		await Promise.all([
			globalThis.lazify
				.getNpmOutdated(projectPath)
				.then((r) => {
					setOutdated(r);
					setLoading((p) => ({ ...p, outdated: false }));
				})
				.catch(() => setLoading((p) => ({ ...p, outdated: false }))),

			globalThis.lazify
				.getNpmAudit(projectPath)
				.then((r) => {
					setAudit(r);
					setLoading((p) => ({ ...p, audit: false }));
				})
				.catch(() => setLoading((p) => ({ ...p, audit: false }))),
		]);

		setLastChecked(new Date());
	}, [projectPath]);

	useEffect(() => {
		void runChecks();
	}, [runChecks]);

	const anyLoading = loading.outdated || loading.audit;

	// Derived counts — guard against unexpected npm v6 / error response shapes
	const outdatedPackages = outdated ? Object.entries(outdated.packages ?? {}) : [];
	const behind = outdatedPackages.filter(([, info]) => isBehindRange(info));
	const majorOnly = outdatedPackages.filter(([, info]) => !isBehindRange(info));
	const score = computeScore(behind.length, audit);
	const auditVulns = audit
		? Object.values(audit.vulnerabilities ?? {}).sort((a, b) => {
				const order: AuditSeverity[] = ["critical", "high", "moderate", "low", "info"];
				return order.indexOf(a.severity) - order.indexOf(b.severity);
			})
		: [];
	const auditCounts = audit?.metadata?.vulnerabilities;
	const auditGroups = groupByFix(auditVulns);

	const outdatedPill = <OutdatedPill checked={outdated !== null} count={behind.length} />;

	const auditPill = (
		<AuditPill
			checked={audit !== null}
			count={auditVulns.length}
			criticalCount={auditCounts?.critical ?? 0}
		/>
	);

	/** The open section's detail. */
	const renderPanel = () => {
		switch (activeTab) {
			case "outdated":
				return (
					<>
						{outdated ? (
							<div className="space-y-3">
								{behind.length === 0 ? (
									<SectionEmpty message={t(translation.HealthPane.OutdatedNone)} />
								) : (
									<>
										<div className="flex items-center justify-end">
											<CopyButton
												value={() => buildUpgradeMarkdown(behind)}
												label={t(translation.HealthPane.CopyForAgent)}
												copiedLabel={t(translation.HealthPane.CopiedForAgent)}
											/>
										</div>
										<div className="grid gap-2">
											{behind.map(([name, info]) => (
												<OutdatedRow key={name} name={name} info={info} />
											))}
										</div>
									</>
								)}

								{majorOnly.length > 0 && <MajorAvailableList packages={majorOnly} />}
							</div>
						) : (
							<SectionEmpty message={t(translation.HealthPane.Loading)} />
						)}
						{outdated?.error && (
							<BodyText className="mt-2 text-[11px] text-error">{outdated.error}</BodyText>
						)}
					</>
				);

			case "audit":
				return (
					<div className="space-y-3">
						<AuditFindings
							checked={audit !== null}
							vulns={auditVulns}
							counts={auditCounts}
							groups={auditGroups}
						/>
						{audit?.error && <BodyText className="mt-1 text-[11px] text-error">{audit.error}</BodyText>}
					</div>
				);
		}
	};

	const spinner = <UiIcon name="refresh-circle" className="h-3 w-3 animate-spin text-accent" />;

	const tabs: TabItem<HealthTab>[] = [
		{
			key: "outdated",
			label: t(translation.HealthPane.OutdatedTitle),
			icon: "package",
			badge: loading.outdated ? spinner : outdatedPill,
		},
		{
			key: "audit",
			label: t(translation.HealthPane.AuditTitle),
			icon: "warning-triangle",
			badge: loading.audit ? spinner : auditPill,
		},
	];

	return (
		<div>
			{/* ── Pane header ── */}
			<div className="flex items-center justify-end gap-2 border-b border-border bg-soft px-4 py-2">
				{lastChecked && !anyLoading && (
					<PillText className="text-[10px] text-muted">
						{t(translation.HealthPane.LastChecked)}&nbsp;
						{lastChecked.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
					</PillText>
				)}

				<IconButton
					icon="refresh-circle"
					iconClassName={anyLoading ? "animate-spin text-accent" : undefined}
					disabled={anyLoading}
					onClick={() => void runChecks()}
					aria-label={t(translation.HealthPane.Refresh)}
				/>
			</div>

			{/* ── Body ── */}
			<div className="p-4 space-y-2">
				{/* Overall health score strip */}
				<div
					className={clsx(
						"flex items-center gap-2 rounded-[14px] border px-4 py-2.5",
						SCORE_STYLES[score],
					)}
				>
					<UiIcon name={SCORE_ICON[score]} className="h-4 w-4 shrink-0" />
					<span className="text-sm font-semibold">{t(SCORE_LABEL[score])}</span>
					{anyLoading && (
						<span className="ml-auto text-[11px] opacity-60">{t(translation.HealthPane.Loading)}</span>
					)}
				</div>

				{/* One section at a time. Each tab carries its own status pill, so
            nothing is hidden by switching — only the detail is. */}
				<TabBar tabs={tabs} value={activeTab} onChange={setActiveTab} />

				<TabPanel activeKey={activeTab} className="rounded-[18px] border border-border bg-soft/30 p-4">
					{renderPanel()}
				</TabPanel>
			</div>
		</div>
	);
}
