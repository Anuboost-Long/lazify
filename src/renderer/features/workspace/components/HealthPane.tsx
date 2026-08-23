import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { BodyText, MonoText, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { CopyButton } from "@renderer/shared/ui/CopyButton";
import { TabBar, TabPanel, type TabItem } from "@renderer/shared/ui/tabs/TabBar";
import type {
  AuditSeverity,
  AuditVulnerability,
  AuditVulnerabilitySource,
  NpmAuditResult,
  NpmOutdatedResult,
  OutdatedPackageInfo
} from "@renderer/shared/types/lazify";

// ─── Health score ─────────────────────────────────────────────────────────────

type HealthScore = "healthy" | "warning" | "critical" | "unknown";

/**
 * A package is only a problem when what is installed is behind what its own
 * range allows — that is a plain `update` away. A newer major sitting outside
 * the range is a deliberate choice, not a fault, so it never scores.
 */
function isBehindRange(info: OutdatedPackageInfo) {
  return Boolean(info.current) && info.current !== info.wanted;
}

function computeScore(
  behindCount: number,
  audit: NpmAuditResult | null
): HealthScore {
  if (behindCount === 0 && !audit) return "unknown";

  const counts = audit?.metadata?.vulnerabilities;

  // "Critical" means there are critical findings. Anything else that needs
  // attention — highs included — is a warning, so the headline never claims a
  // severity the list below it does not contain.
  if ((counts?.critical ?? 0) > 0) return "critical";

  const needsAttention =
    behindCount > 0 || (counts?.high ?? 0) > 0 || (counts?.moderate ?? 0) > 0;

  return needsAttention ? "warning" : "healthy";
}

const SCORE_ICON: Record<HealthScore, "check-circle" | "warning-triangle"> = {
  healthy: "check-circle",
  warning: "warning-triangle",
  critical: "warning-triangle",
  unknown: "check-circle"
};

const SCORE_STYLES: Record<HealthScore, string> = {
  healthy: "border-accent/25 bg-accent/8 text-accent",
  warning: "border-warning/25 bg-warning/10 text-warning",
  critical: "border-error/25 bg-error/8 text-error",
  unknown: "border-border bg-soft text-muted"
};

const SCORE_LABEL: Record<HealthScore, string> = {
  healthy: translation.HealthPane.ScoreHealthy,
  warning: translation.HealthPane.ScoreWarning,
  critical: translation.HealthPane.ScoreCritical,
  unknown: translation.HealthPane.ScoreUnknown
};

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_PILL: Record<AuditSeverity, string> = {
  critical: "border-error/25 bg-error/10 text-error",
  high: "border-warning/30 bg-warning/12 text-warning",
  moderate: "border-warning/20 bg-warning/6 text-warning",
  low: "border-border bg-soft text-muted",
  info: "border-border bg-soft text-muted"
};

const SEVERITY_ROW: Record<AuditSeverity, string> = {
  critical: "border-error/15 bg-error/5",
  high: "border-warning/20 bg-warning/5",
  moderate: "border-border bg-soft/40",
  low: "border-border bg-soft/40",
  info: "border-border bg-soft/20"
};

const SEVERITY_LABEL: Record<AuditSeverity, string> = {
  critical: translation.HealthPane.AuditCritical,
  high: translation.HealthPane.AuditHigh,
  moderate: translation.HealthPane.AuditModerate,
  low: translation.HealthPane.AuditLow,
  info: translation.HealthPane.AuditInfo
};

// ─── Outdated section ─────────────────────────────────────────────────────────

function OutdatedRow({
  name,
  info
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
          <MonoText as="span" className="text-[11px] text-text">{info.current}</MonoText>
        </span>
        <span className="text-muted/40">→</span>
        <span>
          {t(translation.HealthPane.OutdatedWanted)}&nbsp;
          <MonoText as="span" className="text-[11px] font-semibold text-accent">{info.wanted}</MonoText>
        </span>
        {hasNewerMajor && (
          <>
            <span className="text-muted/40">·</span>
            <span className="text-muted/70">
              {t(translation.HealthPane.OutdatedLatest)}&nbsp;
              <MonoText as="span" className="text-[11px] text-muted">{info.latest}</MonoText>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** A package can carry a dozen advisories; enough to identify it, not all of them. */
const MAX_TITLES = 2;

/** Advisory titles for one entry, or a note that it is only affected via others. */
function advisoryTitles(vuln: AuditVulnerability) {
  const titles = vuln.via
    .filter((entry): entry is AuditVulnerabilitySource => typeof entry === "object")
    .map((entry) => entry.title);

  if (titles.length > 0) {
    const shown = titles.slice(0, MAX_TITLES).join("; ");
    const rest = titles.length - MAX_TITLES;

    return rest > 0 ? `${shown} (+${rest} more)` : shown;
  }

  // A string `via` means this package is only pulled in by another vulnerable one.
  const causes = vuln.via.filter((entry): entry is string => typeof entry === "string");

  return causes.length > 0 ? `affected via ${causes.join(", ")}` : "—";
}

/**
 * The upgrade that would clear a finding. Several findings usually share one:
 * five of them can be a single tooling bump, which is the decision the reader
 * actually has to make.
 */
function fixTarget(vuln: AuditVulnerability): string {
  if (typeof vuln.fixAvailable === "object") {
    return `${vuln.fixAvailable.name}@${vuln.fixAvailable.version}`;
  }

  return vuln.fixAvailable ? "npm audit fix" : "no fix available";
}

/** Findings bucketed by the upgrade that resolves them, worst bucket first. */
function groupByFix(vulns: AuditVulnerability[]) {
  const order: AuditSeverity[] = ["critical", "high", "moderate", "low", "info"];
  const groups = new Map<string, AuditVulnerability[]>();

  for (const vuln of vulns) {
    const key = fixTarget(vuln);
    groups.set(key, [...(groups.get(key) ?? []), vuln]);
  }

  const worst = (list: AuditVulnerability[]) =>
    Math.min(...list.map((vuln) => order.indexOf(vuln.severity)));

  return [...groups.entries()]
    .map(([target, list]) => ({ target, list }))
    .sort((a, b) => worst(a.list) - worst(b.list));
}

/** What it would take to fix one entry, in the agent's terms. */
function fixNote(vuln: AuditVulnerability) {
  if (vuln.fixAvailable === true) return "`npm audit fix`";

  if (typeof vuln.fixAvailable === "object") {
    return `${vuln.fixAvailable.isSemVerMajor ? "breaking" : "update"}: ${fixTarget(vuln)}`;
  }

  return "no fix available";
}

/**
 * The audit equivalent of {@link buildUpgradeMarkdown}: everything an agent
 * needs to judge each finding, with the safe command separated from the one
 * that can break the build.
 */
function buildAuditMarkdown(
  vulns: AuditVulnerability[],
  counts: NpmAuditResult["metadata"]["vulnerabilities"] | undefined
) {
  const summary = (["critical", "high", "moderate", "low", "info"] as AuditSeverity[])
    .filter((severity) => (counts?.[severity] ?? 0) > 0)
    .map((severity) => `${counts?.[severity]} ${severity}`)
    .join(", ");

  const rows = vulns
    .map(
      (vuln) =>
        `| ${vuln.name} | ${vuln.severity} | ${vuln.isDirect ? "direct" : "transitive"} | ${advisoryTitles(vuln)} | ${fixNote(vuln)} |`
    )
    .join("\n");

  const forced = vulns.some(
    (vuln) => typeof vuln.fixAvailable === "object" && vuln.fixAvailable.isSemVerMajor
  );

  // Lead with the decisions rather than the symptoms: several findings usually
  // share one upgrade, and that is what has to be judged.
  const groups = groupByFix(vulns)
    .map(({ target, list }) => `- \`${target}\` — clears ${list.length} (${list.map((v) => v.name).join(", ")})`)
    .join("\n");

  const upgrades = groupByFix(vulns).length;
  const safeFixes = vulns.filter((vuln) => vuln.fixAvailable === true).length;
  const finding = vulns.length === 1 ? "finding" : "findings";

  return [
    `Review ${vulns.length} npm audit ${finding}${summary ? ` (${summary})` : ""}.`,
    "",
    `They resolve to ${upgrades} ${upgrades === 1 ? "upgrade" : "upgrades"}:`,
    "",
    groups,
    "",
    ...(safeFixes > 0
      ? [
          "Start with the non-breaking fixes. Do not run `npm audit fix --force`",
          "without checking what it upgrades — it takes major versions.",
          "",
          "```sh",
          "npm audit fix",
          "```",
          ""
        ]
      : ["Nothing here is fixable without a major upgrade — `npm audit fix`", "will not change anything.", ""]),
    "| Package | Severity | Depth | Advisory | Fix |",
    "| --- | --- | --- | --- | --- |",
    rows,
    ...(forced
      ? [
          "",
          "These need a major upgrade, so review each one before taking it:",
          "",
          "```sh",
          "npm audit fix --force",
          "```"
        ]
      : []),
    ""
  ].join("\n");
}

/**
 * A ready-to-paste brief for a coding agent. Deliberately excludes the majors:
 * their "wanted" is what is already installed, so there is nothing to ask for.
 */
function buildUpgradeMarkdown(packages: [string, OutdatedPackageInfo][]) {
  const rows = packages
    .map(([name, info]) => `| ${name} | ${info.current} | ${info.wanted} |`)
    .join("\n");
  // `npm update` moves the lockfile within the existing ranges. `npm install
  // name@version` would rewrite those ranges, which is what we are asking the
  // agent not to do.
  const names = packages.map(([name]) => name).join(" ");

  return [
    `Update these ${packages.length} npm packages to the version their existing`,
    "semver range already allows. This is not a major upgrade — do not change",
    "any version range in package.json.",
    "",
    "| Package | Current | Target |",
    "| --- | --- | --- |",
    rows,
    "",
    "```sh",
    `npm update ${names}`,
    "```",
    ""
  ].join("\n");
}

/**
 * Packages already at the newest version their range allows. Listed for
 * awareness only — taking these means a deliberate major upgrade.
 */
function MajorAvailableList({
  packages
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

function AuditSeverityPill({ severity }: Readonly<{ severity: AuditSeverity }>) {
  const { t } = useTranslation();
  return (
    <PillText
      as="span"
      className={clsx(
        "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        SEVERITY_PILL[severity]
      )}
    >
      {t(SEVERITY_LABEL[severity])}
    </PillText>
  );
}

function AuditVulnRow({ vuln }: Readonly<{ vuln: AuditVulnerability }>) {
  const { t } = useTranslation();

  const isFixable =
    vuln.fixAvailable === true ||
    (typeof vuln.fixAvailable === "object" && !vuln.fixAvailable.isSemVerMajor);
  const isForceFixable =
    typeof vuln.fixAvailable === "object" && vuln.fixAvailable.isSemVerMajor;

  const firstVia = vuln.via[0];
  const title =
    typeof firstVia === "object" && "title" in firstVia
      ? firstVia.title
      : null;

  return (
    <div
      className={clsx(
        "rounded-[14px] border px-3.5 py-2.5",
        SEVERITY_ROW[vuln.severity]
      )}
    >
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
                    : "border-warning/20 bg-warning/8 text-warning"
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
          {title && (
            <BodyText className="mt-1 text-[11px] text-muted">{title}</BodyText>
          )}
        </div>
      </div>
    </div>
  );
}

/** One upgrade decision, with the findings it would resolve underneath it. */
function AuditFixGroup({
  target,
  vulns
}: Readonly<{ target: string; vulns: AuditVulnerability[] }>) {
  const { t } = useTranslation();
  const worst = (["critical", "high", "moderate", "low", "info"] as AuditSeverity[]).find(
    (severity) => vulns.some((vuln) => vuln.severity === severity)
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

function AuditSeveritySummary({
  counts
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
            SEVERITY_PILL[s]
          )}
        >
          {counts[s]} {t(SEVERITY_LABEL[s])}
        </PillText>
      ))}
    </div>
  );
}

// ─── Loading / error placeholders ────────────────────────────────────────────

function SectionEmpty({ message }: Readonly<{ message: string }>) {
  return (
    <BodyText className="py-1 text-[11px] text-muted">{message}</BodyText>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface HealthPaneProps {
  projectPath: string;
}

type HealthTab = "outdated" | "audit";

interface SectionLoading {
  outdated: boolean;
  audit: boolean;
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
      globalThis.lazify.getNpmOutdated(projectPath)
        .then((r) => { setOutdated(r); setLoading((p) => ({ ...p, outdated: false })); })
        .catch(() => setLoading((p) => ({ ...p, outdated: false }))),

      globalThis.lazify.getNpmAudit(projectPath)
        .then((r) => { setAudit(r); setLoading((p) => ({ ...p, audit: false })); })
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

  const outdatedPill = outdated ? (
    behind.length === 0 ? (
      <PillText
        as="span"
        className="rounded-full border border-accent/20 bg-accent/8 px-2.5 py-0.5 text-[10px] font-semibold text-accent"
      >
        {t(translation.HealthPane.OutdatedNone)}
      </PillText>
    ) : (
      <PillText
        as="span"
        className="rounded-full border border-warning/25 bg-warning/10 px-2.5 py-0.5 text-[10px] font-semibold text-warning"
      >
        {t(
          behind.length === 1
            ? translation.HealthPane.OutdatedCountOne
            : translation.HealthPane.OutdatedCountOther,
          { count: behind.length }
        )}
      </PillText>
    )
  ) : null;

  const auditPill = audit ? (
    auditVulns.length === 0 ? (
      <PillText
        as="span"
        className="rounded-full border border-accent/20 bg-accent/8 px-2.5 py-0.5 text-[10px] font-semibold text-accent"
      >
        {t(translation.HealthPane.AuditClean)}
      </PillText>
    ) : (
      <PillText
        as="span"
        className={clsx(
          "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
          (auditCounts?.critical ?? 0) > 0
            ? "border-error/25 bg-error/10 text-error"
            : "border-warning/25 bg-warning/10 text-warning"
        )}
      >
        {t(
          auditVulns.length === 1
            ? translation.HealthPane.AuditCountOne
            : translation.HealthPane.AuditCountOther,
          { count: auditVulns.length }
        )}
      </PillText>
    )
  ) : null;

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
            {audit ? (
              auditVulns.length === 0 ? (
                <SectionEmpty message={t(translation.HealthPane.AuditClean)} />
              ) : (
                <>
                  {/* Same affordance as the package list: hand the findings to
                      an agent instead of retyping them. */}
                  <div className="flex items-center gap-2">
                    {auditCounts && <AuditSeveritySummary counts={auditCounts} />}
                    <CopyButton
                      className="ml-auto"
                      value={() => buildAuditMarkdown(auditVulns, auditCounts)}
                      label={t(translation.HealthPane.CopyForAgent)}
                      copiedLabel={t(translation.HealthPane.CopiedForAgent)}
                    />
                  </div>
                  <div className="grid gap-2">
                    {auditGroups.map((group) => (
                      <AuditFixGroup key={group.target} target={group.target} vulns={group.list} />
                    ))}
                  </div>
                </>
              )
            ) : (
              <SectionEmpty message={t(translation.HealthPane.Loading)} />
            )}
            {audit?.error && (
              <BodyText className="mt-1 text-[11px] text-error">{audit.error}</BodyText>
            )}
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
      badge: loading.outdated ? spinner : outdatedPill
    },
    {
      key: "audit",
      label: t(translation.HealthPane.AuditTitle),
      icon: "warning-triangle",
      badge: loading.audit ? spinner : auditPill
    }
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
            SCORE_STYLES[score]
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

        <TabPanel
          activeKey={activeTab}
          className="rounded-[18px] border border-border bg-soft/30 p-4"
        >
          {renderPanel()}
        </TabPanel>

      </div>
    </div>
  );
}
