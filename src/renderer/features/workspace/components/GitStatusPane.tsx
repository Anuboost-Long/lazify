import clsx from "clsx";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { GitStatusEntry, ProjectGitStatusResult } from "@renderer/shared/types/lazify";

interface GitStatusPaneProps {
  busy: boolean;
  gitStatus: ProjectGitStatusResult | null;
  loading: boolean;
  selectedPath: string | null;
  onSelect: (entry: GitStatusEntry) => void;
}

function getStatusTone(entry: GitStatusEntry): string {
  const codes = `${entry.stagedStatus}${entry.unstagedStatus}`;

  if (codes.includes("D")) return "border-error/20 bg-error/10 text-error";
  if (codes.includes("A")) return "border-accent/20 bg-accent/10 text-accent";
  if (codes.includes("R")) return "border-warning/20 bg-warning/10 text-warning";
  if (codes.includes("?")) return "border-border bg-soft text-muted";

  // Modified
  return "border-warning/25 bg-warning/10 text-warning";
}

export function GitStatusPane({
  busy,
  gitStatus,
  loading,
  selectedPath,
  onSelect,
}: GitStatusPaneProps) {
  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-bg shadow-panel">

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-soft px-5 py-3.5">
        <UiIcon name="activity" className="h-4 w-4 text-muted" />
        <div className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          Commit status
        </div>
        {(busy || loading) && (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Checking…
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex h-[calc(44rem-57px)] flex-col bg-bg p-4">

        {/* Initial load — no data yet */}
        {loading && !gitStatus && (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 p-8 text-center">
            <div>
              <p className="text-lg font-semibold text-text">Checking repository status</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                Lazify is reading uncommitted file changes from Git.
              </p>
            </div>
          </div>
        )}

        {/* Not a git repo */}
        {!loading && gitStatus && !gitStatus.isGitRepo && (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 p-8 text-center">
            <div className="max-w-sm">
              <p className="text-lg font-semibold text-text">No Git repository detected</p>
              <p className="mt-3 text-sm leading-6 text-muted">
                This synced project does not have a readable Git repository at its current path.
              </p>
            </div>
          </div>
        )}

        {/* Git repo — branch info always visible, list area shows loading or entries */}
        {gitStatus?.isGitRepo && (
          <>
            <div className="space-y-2">
              <div className="rounded-xl border border-accent/20 bg-accent/8 px-3 py-2 text-sm font-semibold text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                {gitStatus.branch ? `Branch: ${gitStatus.branch}` : "Detached HEAD"}
              </div>
              <div className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted">
                {gitStatus.repoRoot ?? gitStatus.projectPath}
              </div>
            </div>

            <div className="mt-4 rounded-full border border-border bg-soft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              {gitStatus.entries.length} uncommitted file{gitStatus.entries.length === 1 ? "" : "s"}
            </div>

            {loading ? (
              <div className="mt-5 flex flex-1 items-center justify-center gap-2 text-sm text-muted">
                <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
                Refreshing…
              </div>
            ) : !gitStatus.hasUncommittedChanges ? (
              <div className="mt-4 flex flex-1 items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 p-8 text-center">
                <div>
                  <p className="text-lg font-semibold text-text">Working tree is clean</p>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    There are no uncommitted file changes in this repository.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
                <div className="grid gap-2">
                  {gitStatus.entries.map((entry) => {
                    const selected = selectedPath === entry.absolutePath;
                    return (
                      <button
                        key={`${entry.absolutePath}-${entry.stagedStatus}-${entry.unstagedStatus}`}
                        type="button"
                        onClick={() => onSelect(entry)}
                        className={clsx(
                          "w-full rounded-[18px] border px-4 py-3 text-left",
                          "transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5",
                          selected
                            ? "border-accent/35 bg-accent/10 text-text shadow-[0_18px_40px_rgba(16,185,129,0.1)]"
                            : "border-border bg-soft/40 text-text hover:border-accent/20 hover:bg-soft/70"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm">{entry.path}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted">
                              {entry.stagedStatus === " " ? "—" : entry.stagedStatus} staged
                              {" · "}
                              {entry.unstagedStatus === " " ? "—" : entry.unstagedStatus} unstaged
                            </p>
                          </div>
                          <span
                            className={clsx(
                              "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                              getStatusTone(entry)
                            )}
                          >
                            {entry.statusLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
