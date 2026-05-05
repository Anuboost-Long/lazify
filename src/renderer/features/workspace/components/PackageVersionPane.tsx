import { useState } from "react";
import clsx from "clsx";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { PackageMatch, VersionMatchReport } from "@renderer/shared/types/lazify";

interface PackageVersionPaneProps {
  projectPath: string;
}

function ActionBadge({ action }: { action: PackageMatch["action"] }) {
  const styles = {
    keep: "border-accent/20 bg-accent/10 text-accent",
    update: "border-accent/30 bg-accent/15 text-accent",
    downgrade: "border-warning/25 bg-warning/10 text-warning"
  };
  const labels = { keep: "OK", update: "Update", downgrade: "Downgrade" };
  return (
    <span
      className={clsx(
        "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
        styles[action]
      )}
    >
      {labels[action]}
    </span>
  );
}

function CompatBadge({ status }: { status: PackageMatch["compatibility"] }) {
  if (status === "compatible") return null;
  const styles = {
    incompatible: "text-warning",
    unknown: "text-muted"
  };
  const labels = {
    incompatible: "Incompatible",
    unknown: "Unknown"
  };
  return (
    <span className={clsx("text-[10px] font-semibold uppercase tracking-[0.16em]", styles[status])}>
      {labels[status]}
    </span>
  );
}

function SummaryPills({ report }: { report: VersionMatchReport }) {
  const needsFix = report.packages.filter((p) => p.action !== "keep").length;
  const compatible = report.packages.filter((p) => p.action === "keep").length;
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-border bg-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {report.packages.length} checked
      </span>
      {compatible > 0 && (
        <span className="rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
          {compatible} compatible
        </span>
      )}
      {needsFix > 0 && (
        <span className="rounded-full border border-warning/25 bg-warning/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-warning">
          {needsFix} need fix
        </span>
      )}
      {report.unresolved.length > 0 && (
        <span className="rounded-full border border-border bg-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {report.unresolved.length} unresolved
        </span>
      )}
    </div>
  );
}

export function PackageVersionPane({ projectPath }: PackageVersionPaneProps) {
  const [report, setReport] = useState<VersionMatchReport | null>(null);
  const [scanning, setScanning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);

  const runDoctor = async () => {
    setScanning(true);
    setFixMessage(null);
    try {
      const result = await window.lazify.matchPackageVersions(projectPath);
      setReport(result);
    } finally {
      setScanning(false);
    }
  };

  const applyFix = async () => {
    setFixing(true);
    setFixMessage(null);
    try {
      const result = await window.lazify.fixProjectPackageVersions(projectPath);
      setFixMessage(result.message);
      // Refresh the report after fix
      const refreshed = await window.lazify.matchPackageVersions(projectPath);
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
        <div className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Package Doctor
        </div>
        <div className="flex items-center gap-2">
          {needsFix && !fixing && (
            <button
              type="button"
              onClick={() => void applyFix()}
              className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent transition-colors hover:bg-accent/20"
            >
              Apply Fix
            </button>
          )}
          <button
            type="button"
            onClick={() => void runDoctor()}
            disabled={scanning || fixing}
            className="rounded-full border border-border bg-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted transition-colors hover:border-accent/40 hover:text-text disabled:opacity-40"
          >
            {scanning ? "Scanning…" : "Run Doctor"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4">

        {/* Idle — no scan yet */}
        {!report && !scanning && (
          <div className="flex items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 py-12 text-center">
            <div>
              <p className="text-base font-semibold text-text">Check package compatibility</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Run Doctor to find packages that need updating or downgrading
                <br />
                to match this project's {report ? `${(report as VersionMatchReport).anchorPackage} version` : "framework version"}.
              </p>
            </div>
          </div>
        )}

        {/* Scanning */}
        {scanning && (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted">
            <UiIcon name="refresh-circle" className="h-5 w-5 animate-spin text-accent" />
            Querying npm registry for compatible versions…
          </div>
        )}

        {/* Fixing */}
        {fixing && (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted">
            <UiIcon name="refresh-circle" className="h-5 w-5 animate-spin text-accent" />
            Installing compatible package versions…
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
              Anchored to{" "}
              <span className="font-semibold text-text">
                {report.anchorPackage}@{report.anchorVersion}
              </span>
            </div>

            {/* Summary pills */}
            <SummaryPills report={report} />

            {/* All good */}
            {allGood && (
              <div className="flex items-center justify-center rounded-[20px] border border-dashed border-accent/25 bg-accent/5 py-8 text-center">
                <div>
                  <p className="text-base font-semibold text-accent">All packages are compatible</p>
                  <p className="mt-1 text-sm text-muted">No version changes are needed.</p>
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
                          <p className="truncate font-mono text-sm font-semibold text-text">
                            {pkg.name}
                          </p>
                          <CompatBadge status={pkg.compatibility} />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <span>
                            Current: <span className="font-mono text-text">{pkg.currentSpec}</span>
                          </span>
                          {pkg.targetVersion && pkg.action !== "keep" && (
                            <>
                              <span>→</span>
                              <span>
                                Target:{" "}
                                <span className="font-mono font-semibold text-text">
                                  {pkg.targetVersion}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mt-1.5 text-[11px] leading-4 text-muted">{pkg.reason}</p>
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
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Unresolved ({report.unresolved.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {report.unresolved.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-border bg-bg px-2.5 py-0.5 font-mono text-[11px] text-muted"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Install plan preview */}
            {report.installPlan.length > 0 && (
              <div className="rounded-[18px] border border-warning/20 bg-warning/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-warning">
                  Install plan ({report.installPlan.length} packages)
                </p>
                <div className="mt-2 space-y-1">
                  {report.installPlan.map((spec) => (
                    <p key={spec} className="font-mono text-[11px] text-muted">
                      {spec}
                    </p>
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
