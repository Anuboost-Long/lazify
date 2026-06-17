import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, MonoText, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { IconButton } from "@renderer/shared/ui/IconButton";
import type {
  AuditSeverity,
  AuditVulnerability,
  NpmAuditResult,
  NpmOutdatedResult,
  OutdatedPackageInfo,
  ProjectGitStatusResult
} from "@renderer/shared/types/lazify";

// ─── Health score ─────────────────────────────────────────────────────────────

type HealthScore = "healthy" | "warning" | "critical" | "unknown";

function computeScore(
  git: ProjectGitStatusResult | null,
  outdated: NpmOutdatedResult | null,
  audit: NpmAuditResult | null
): HealthScore {
  if (!git && !outdated && !audit) return "unknown";
  const counts = audit?.metadata?.vulnerabilities;
  if (counts && (counts.critical > 0 || counts.high > 0)) return "critical";
  const hasOutdated = outdated && Object.keys(outdated.packages ?? {}).length > 0;
  const hasUncommitted = git?.hasUncommittedChanges;
  const hasModerate = counts && counts.moderate > 0;
  if (hasOutdated || hasUncommitted || hasModerate) return "warning";
  return "healthy";
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

// ─── Git status tone (mirrors GitStatusPane) ──────────────────────────────────

function gitEntryTone(staged: string, unstaged: string): string {
  const codes = `${staged}${unstaged}`;
  if (codes.includes("D")) return "border-error/20 bg-error/10 text-error";
  if (codes.includes("A")) return "border-accent/20 bg-accent/10 text-accent";
  if (codes.includes("R")) return "border-warning/20 bg-warning/10 text-warning";
  if (codes.includes("?")) return "border-border bg-soft text-muted";
  return "border-warning/25 bg-warning/10 text-warning";
}

// ─── Section accordion header ─────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: "activity" | "package" | "warning-triangle";
  title: string;
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
  children: React.ReactNode; // summary pill(s)
}

function SectionHeader({ icon, title, expanded, loading, onToggle, children }: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-soft/60"
    >
      <UiIcon name={icon} className="h-3.5 w-3.5 shrink-0 text-muted" />
      <OverlineText className="min-w-0 flex-1 text-muted">{title}</OverlineText>
      {loading ? (
        <UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin text-accent" />
      ) : (
        children
      )}
      <UiIcon
        name="collapse"
        className={clsx(
          "ml-0.5 h-3.5 w-3.5 shrink-0 text-muted/50 transition-transform duration-200",
          !expanded && "-rotate-90"
        )}
      />
    </button>
  );
}

// ─── Git section ──────────────────────────────────────────────────────────────

function GitDetail({ git }: { git: ProjectGitStatusResult }) {
  const { t } = useTranslation();

  if (!git.isGitRepo) {
    return (
      <BodyText className="text-[11px] text-muted">{t(translation.HealthPane.GitNoRepo)}</BodyText>
    );
  }

  const shownEntries = git.entries.slice(0, 8);
  const overflow = git.entries.length - shownEntries.length;

  return (
    <div className="space-y-2">
      {git.branch && (
        <div className="flex items-center gap-2">
          <MonoText className="rounded-full border border-accent/20 bg-accent/8 px-2.5 py-0.5 text-[11px] text-accent">
            {git.branch}
          </MonoText>
          {git.remoteUrl && (
            <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{git.remoteUrl}</span>
          )}
        </div>
      )}

      {!git.hasUncommittedChanges ? (
        <BodyText className="text-[11px] text-accent">{t(translation.GitStatus.TreeClean)}</BodyText>
      ) : (
        <div className="grid gap-1.5 pt-0.5">
          {shownEntries.map((e) => (
            <div
              key={e.absolutePath}
              className="flex items-center gap-2"
            >
              <MonoText className="min-w-0 flex-1 truncate text-[11px] text-text">{e.path}</MonoText>
              <PillText
                as="span"
                className={clsx(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  gitEntryTone(e.stagedStatus, e.unstagedStatus)
                )}
              >
                {e.statusLabel}
              </PillText>
            </div>
          ))}
          {overflow > 0 && (
            <BodyText className="text-[11px] text-muted">+{overflow} more files</BodyText>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Outdated section ─────────────────────────────────────────────────────────

function OutdatedRow({
  name,
  info
}: {
  name: string;
  info: OutdatedPackageInfo;
}) {
  const { t } = useTranslation();
  const isMajorBehind = info.wanted !== info.latest;

  return (
    <div
      className={clsx(
        "rounded-[14px] border px-3.5 py-2.5",
        isMajorBehind
          ? "border-error/15 bg-error/5"
          : "border-warning/20 bg-warning/5"
      )}
    >
      <div className="flex items-center gap-2">
        <MonoText className="min-w-0 flex-1 truncate text-[12px] font-semibold text-text">
          {name}
        </MonoText>
        {isMajorBehind && (
          <PillText
            as="span"
            className="shrink-0 rounded-full border border-error/25 bg-error/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-error"
          >
            major
          </PillText>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span>
          {t(translation.HealthPane.OutdatedCurrent)}&nbsp;
          <MonoText as="span" className="text-[11px] text-text">{info.current}</MonoText>
        </span>
        <span className="text-muted/40">→</span>
        <span>
          {t(translation.HealthPane.OutdatedWanted)}&nbsp;
          <MonoText as="span" className="text-[11px] font-semibold text-text">{info.wanted}</MonoText>
        </span>
        {isMajorBehind && (
          <>
            <span className="text-muted/40">·</span>
            <span>
              {t(translation.HealthPane.OutdatedLatest)}&nbsp;
              <MonoText as="span" className="text-[11px] font-semibold text-error">{info.latest}</MonoText>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Audit section ────────────────────────────────────────────────────────────

function AuditSeverityPill({ severity }: { severity: AuditSeverity }) {
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

function AuditVulnRow({ vuln }: { vuln: AuditVulnerability }) {
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

function AuditSeveritySummary({ counts }: { counts: NpmAuditResult["metadata"]["vulnerabilities"] }) {
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

function SectionEmpty({ message }: { message: string }) {
  return (
    <BodyText className="py-1 text-[11px] text-muted">{message}</BodyText>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface HealthPaneProps {
  projectPath: string;
}

interface SectionExpanded {
  git: boolean;
  outdated: boolean;
  audit: boolean;
}

interface SectionLoading {
  git: boolean;
  outdated: boolean;
  audit: boolean;
}

export function HealthPane({ projectPath }: HealthPaneProps) {
  const { t } = useTranslation();

  const [git, setGit] = useState<ProjectGitStatusResult | null>(null);
  const [outdated, setOutdated] = useState<NpmOutdatedResult | null>(null);
  const [audit, setAudit] = useState<NpmAuditResult | null>(null);

  const [loading, setLoading] = useState<SectionLoading>({ git: false, outdated: false, audit: false });
  const [expanded, setExpanded] = useState<SectionExpanded>({ git: true, outdated: true, audit: true });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runChecks = useCallback(async () => {
    setLoading({ git: true, outdated: true, audit: true });

    await Promise.all([
      globalThis.lazify.getProjectGitStatus(projectPath)
        .then((r) => { setGit(r); setLoading((p) => ({ ...p, git: false })); })
        .catch(() => setLoading((p) => ({ ...p, git: false }))),

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

  const toggle = (key: keyof SectionExpanded) =>
    setExpanded((p) => ({ ...p, [key]: !p[key] }));

  const anyLoading = loading.git || loading.outdated || loading.audit;
  const score = computeScore(git, outdated, audit);

  // Derived counts — guard against unexpected npm v6 / error response shapes
  const outdatedPackages = outdated ? Object.entries(outdated.packages ?? {}) : [];
  const auditVulns = audit
    ? Object.values(audit.vulnerabilities ?? {}).sort((a, b) => {
        const order: AuditSeverity[] = ["critical", "high", "moderate", "low", "info"];
        return order.indexOf(a.severity) - order.indexOf(b.severity);
      })
    : [];
  const auditCounts = audit?.metadata?.vulnerabilities;
  const shownVulns = auditVulns.slice(0, 10);
  const vulnOverflow = auditVulns.length - shownVulns.length;

  // Git summary pill
  const gitPill = (() => {
    if (!git) return null;
    if (!git.isGitRepo)
      return (
        <PillText as="span" className="text-[10px] text-muted">
          {t(translation.HealthPane.GitNoRepo)}
        </PillText>
      );
    if (!git.hasUncommittedChanges)
      return (
        <PillText
          as="span"
          className="rounded-full border border-accent/20 bg-accent/8 px-2.5 py-0.5 text-[10px] font-semibold text-accent"
        >
          {t(translation.HealthPane.GitClean)}
        </PillText>
      );
    return (
      <PillText
        as="span"
        className="rounded-full border border-warning/25 bg-warning/10 px-2.5 py-0.5 text-[10px] font-semibold text-warning"
      >
        {t(
          git.entries.length === 1
            ? translation.HealthPane.GitDirtyOne
            : translation.HealthPane.GitDirtyOther,
          { count: git.entries.length }
        )}
      </PillText>
    );
  })();

  // Outdated summary pill
  const outdatedPill = outdated ? (
    outdatedPackages.length === 0 ? (
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
          outdatedPackages.length === 1
            ? translation.HealthPane.OutdatedCountOne
            : translation.HealthPane.OutdatedCountOther,
          { count: outdatedPackages.length }
        )}
      </PillText>
    )
  ) : null;

  // Audit summary pill
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
          (auditCounts?.critical ?? 0) > 0 || (auditCounts?.high ?? 0) > 0
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

  return (
    <div className="overflow-hidden rounded-[26px] border border-border bg-bg shadow-panel">

      {/* ── Pane header ── */}
      <div className="flex items-center gap-2 border-b border-border bg-soft px-5 py-3.5">
        <UiIcon name="activity" className="h-4 w-4 text-muted" />
        <OverlineText className="min-w-0 flex-1 text-muted">
          {t(translation.HealthPane.Title)}
        </OverlineText>

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

        {/* ── Git section ── */}
        <div className="overflow-hidden rounded-[18px] border border-border bg-soft/30">
          <SectionHeader
            icon="activity"
            title={t(translation.HealthPane.GitTitle)}
            expanded={expanded.git}
            loading={loading.git}
            onToggle={() => toggle("git")}
          >
            {gitPill}
          </SectionHeader>

          {expanded.git && (
            <div className="border-t border-border px-4 pb-4 pt-3">
              {git ? (
                <GitDetail git={git} />
              ) : (
                <SectionEmpty message={t(translation.HealthPane.Loading)} />
              )}
            </div>
          )}
        </div>

        {/* ── Outdated packages section ── */}
        <div className="overflow-hidden rounded-[18px] border border-border bg-soft/30">
          <SectionHeader
            icon="package"
            title={t(translation.HealthPane.OutdatedTitle)}
            expanded={expanded.outdated}
            loading={loading.outdated}
            onToggle={() => toggle("outdated")}
          >
            {outdatedPill}
          </SectionHeader>

          {expanded.outdated && (
            <div className="border-t border-border px-4 pb-4 pt-3">
              {outdated ? (
                outdatedPackages.length === 0 ? (
                  <SectionEmpty message={t(translation.HealthPane.OutdatedNone)} />
                ) : (
                  <div className="grid gap-2">
                    {outdatedPackages.map(([name, info]) => (
                      <OutdatedRow key={name} name={name} info={info} />
                    ))}
                  </div>
                )
              ) : (
                <SectionEmpty message={t(translation.HealthPane.Loading)} />
              )}
              {outdated?.error && (
                <BodyText className="mt-2 text-[11px] text-error">{outdated.error}</BodyText>
              )}
            </div>
          )}
        </div>

        {/* ── Security audit section ── */}
        <div className="overflow-hidden rounded-[18px] border border-border bg-soft/30">
          <SectionHeader
            icon="warning-triangle"
            title={t(translation.HealthPane.AuditTitle)}
            expanded={expanded.audit}
            loading={loading.audit}
            onToggle={() => toggle("audit")}
          >
            {auditPill}
          </SectionHeader>

          {expanded.audit && (
            <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
              {audit ? (
                auditVulns.length === 0 ? (
                  <SectionEmpty message={t(translation.HealthPane.AuditClean)} />
                ) : (
                  <>
                    {auditCounts && <AuditSeveritySummary counts={auditCounts} />}
                    <div className="grid gap-2">
                      {shownVulns.map((v) => (
                        <AuditVulnRow key={v.name} vuln={v} />
                      ))}
                    </div>
                    {vulnOverflow > 0 && (
                      <BodyText className="text-[11px] text-muted">
                        +{vulnOverflow} more vulnerabilities
                      </BodyText>
                    )}
                  </>
                )
              ) : (
                <SectionEmpty message={t(translation.HealthPane.Loading)} />
              )}
              {audit?.error && (
                <BodyText className="mt-1 text-[11px] text-error">{audit.error}</BodyText>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
