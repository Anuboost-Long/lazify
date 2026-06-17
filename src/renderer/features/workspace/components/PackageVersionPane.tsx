import { useState } from "react";
import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, MonoText, OverlineText, PillText, Typography } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import type { PackageMatch, VersionMatchReport } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface PackageVersionPaneProps {
  projectPath: string;
}

function ActionBadge({ action }: { action: PackageMatch["action"] }) {
  const { t } = useTranslation();
  const styles = {
    keep: "border-accent/20 bg-accent/10 text-accent",
    update: "border-accent/30 bg-accent/15 text-accent",
    downgrade: "border-warning/25 bg-warning/10 text-warning"
  };
  const labels = {
    keep: translation.PackageDoctor.StatusOk,
    update: translation.PackageDoctor.StatusUpdate,
    downgrade: translation.PackageDoctor.StatusDowngrade
  };
  return (
    <PillText
      as="span"
      className={clsx(
        "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        styles[action]
      )}
    >
      {t(labels[action])}
    </PillText>
  );
}

function CompatBadge({ status }: { status: PackageMatch["compatibility"] }) {
  const { t } = useTranslation();
  if (status === "compatible") return null;
  const styles = {
    incompatible: "text-warning",
    unknown: "text-muted"
  };
  const labels = {
    incompatible: translation.PackageDoctor.StatusIncompatible,
    unknown: translation.PackageDoctor.StatusUnknown
  };
  return (
    <PillText as="span" className={clsx("text-[10px]", styles[status])}>
      {t(labels[status])}
    </PillText>
  );
}

function SummaryPills({ report }: { report: VersionMatchReport }) {
  const { t } = useTranslation();
  const needsFix = report.packages.filter((p) => p.action !== "keep").length;
  const compatible = report.packages.filter((p) => p.action === "keep").length;
  return (
    <div className="flex flex-wrap gap-2">
      <PillText as="span" className="rounded-full border border-border bg-soft px-3 py-1 text-muted">
        {t(translation.PackageDoctor.Checked, { count: report.packages.length })}
      </PillText>
      {compatible > 0 && (
        <PillText as="span" className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-accent">
          {t(translation.PackageDoctor.Compatible, { count: compatible })}
        </PillText>
      )}
      {needsFix > 0 && (
        <PillText as="span" className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-warning">
          {t(translation.PackageDoctor.NeedsFix, { count: needsFix })}
        </PillText>
      )}
      {report.unresolved.length > 0 && (
        <PillText as="span" className="rounded-full border border-border bg-soft px-3 py-1 text-muted">
          {t(translation.PackageDoctor.Unresolved, { count: report.unresolved.length })}
        </PillText>
      )}
    </div>
  );
}

export function PackageVersionPane({ projectPath }: PackageVersionPaneProps) {
  const { t } = useTranslation();
  const [report, setReport] = useState<VersionMatchReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  const runDoctor = async () => {
    setScanning(true);
    setFixMessage(null);
    try {
      const result = await globalThis.lazify.matchPackageVersions(projectPath);
      setReport(result);
    } finally {
      setScanning(false);
    }
  };

  const applyFix = async () => {
    setFixing(true);
    setFixMessage(null);
    try {
      const result = await globalThis.lazify.fixProjectPackageVersions(projectPath);
      setFixMessage(result.message);
      // Refresh the report after fix
      const refreshed = await globalThis.lazify.matchPackageVersions(projectPath);
      setReport(refreshed);
    } finally {
      setFixing(false);
    }
  };

  const needsFix = report ? report.installPlan.length > 0 : false;
  const allGood = report && !needsFix && report.unresolved.length === 0;

  return (
    <div className="overflow-hidden rounded-[26px] border border-border bg-bg shadow-panel">

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-soft px-5 py-3.5">
        <UiIcon name="package" className="h-4 w-4 text-muted" />
        <OverlineText className="min-w-0 flex-1 text-muted">
          {t(translation.PackageDoctor.Title)}
        </OverlineText>
        <div className="flex items-center gap-2">
          {needsFix && !fixing && (
            <LabelButton
              label={translation.PackageDoctor.ApplyFix}
              variant="accent"
              onClick={() => void applyFix()}
            />
          )}
          <LabelButton
            label={scanning ? translation.PackageDoctor.Scanning : translation.PackageDoctor.RunDoctor}
            loading={scanning}
            disabled={scanning || fixing}
            onClick={() => void runDoctor()}
          />
        </div>
      </div>

      {/* Body */}
      <div className="p-4">

        {/* Idle — no scan yet */}
        {!report && !scanning && (
          <div className="flex items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 py-12 text-center">
            <div>
              <CardTitle>{t(translation.PackageDoctor.CheckCompat)}</CardTitle>
              <BodyText className="mt-2 text-muted">
                {t(translation.PackageDoctor.EmptyDesc)}
              </BodyText>
            </div>
          </div>
        )}

        {/* Scanning */}
        {scanning && (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted">
            <UiIcon name="refresh-circle" className="h-5 w-5 animate-spin text-accent" />
            {t(translation.PackageDoctor.QueryingNpm)}
          </div>
        )}

        {/* Fixing */}
        {fixing && (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted">
            <UiIcon name="refresh-circle" className="h-5 w-5 animate-spin text-accent" />
            {t(translation.PackageDoctor.InstallingCompat)}
          </div>
        )}

        {/* Fix result message */}
        {fixMessage && !fixing && (
          <div className="mb-4 rounded-xl border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-text">
            {fixMessage}
          </div>
        )}

        {/* Report */}
        {report && !scanning && !fixing && (
          <div className="space-y-4">

            {/* Anchor */}
            <div className="rounded-xl border border-border px-3 py-2 text-xs text-muted">
              {t(translation.PackageDoctor.AnchoredTo, { package: report.anchorPackage, version: report.anchorVersion })}
            </div>

            {/* Summary pills */}
            <SummaryPills report={report} />

            {/* All good */}
            {allGood && (
              <div className="flex items-center justify-center rounded-[20px] border border-dashed border-accent/25 bg-accent/5 py-8 text-center">
                <div>
                  <CardTitle className="text-accent">{t(translation.PackageDoctor.AllCompatible)}</CardTitle>
                  <BodyText className="mt-1 text-muted">{t(translation.PackageDoctor.NoChanges)}</BodyText>
                </div>
              </div>
            )}

            {/* Package list */}
            {report.packages.length > 0 && (
              <div className="grid gap-2">
                {report.packages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={clsx(
                      "rounded-[18px] border px-4 py-3",
                      pkg.action === "keep"
                        ? "border-border bg-soft/30"
                        : pkg.action === "downgrade"
                          ? "border-warning/20 bg-warning/5"
                          : "border-accent/15 bg-accent/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <MonoText className="truncate text-sm font-semibold text-text">
                            {pkg.name}
                          </MonoText>
                          <CompatBadge status={pkg.compatibility} />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <Typography as="span" variant="caption" className="text-muted">
                            Current: <MonoText as="span" className="text-xs text-text">{pkg.currentSpec}</MonoText>
                          </Typography>
                          {pkg.targetVersion && pkg.action !== "keep" && (
                            <>
                              <Typography as="span" variant="caption" className="text-muted">→</Typography>
                              <Typography as="span" variant="caption" className="text-muted">
                                Target:{" "}
                                <MonoText as="span" className="text-xs font-semibold text-text">
                                  {pkg.targetVersion}
                                </MonoText>
                              </Typography>
                            </>
                          )}
                        </div>
                        <BodyText className="mt-1.5 text-[11px] text-muted">{pkg.reason}</BodyText>
                      </div>
                      <ActionBadge action={pkg.action} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unresolved */}
            {report.unresolved.length > 0 && (
              <div className="rounded-[18px] border border-border bg-soft/30 px-4 py-3">
                <PillText className="text-muted">
                  {t(translation.PackageDoctor.Unresolved, { count: report.unresolved.length })}
                </PillText>
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.unresolved.map((name) => (
                    <MonoText
                      as="span"
                      key={name}
                      className="rounded-full border border-border bg-bg px-2.5 py-0.5 font-mono text-[11px] text-muted"
                    >
                      {name}
                    </MonoText>
                  ))}
                </div>
              </div>
            )}

            {/* Install plan preview */}
            {report.installPlan.length > 0 && (
              <div className="rounded-[18px] border border-warning/20 bg-warning/5 px-4 py-3">
                <PillText className="text-warning">
                  {t(translation.PackageDoctor.InstallPlan, { count: report.installPlan.length })}
                </PillText>
                <div className="mt-2 space-y-1">
                  {report.installPlan.map((spec) => (
                    <MonoText key={spec} className="text-[11px] text-muted">
                      {spec}
                    </MonoText>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
