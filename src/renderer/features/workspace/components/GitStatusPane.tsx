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

function getStatusTone(entry: GitStatusEntry) {
  const codes = `${entry.stagedStatus}${entry.unstagedStatus}`;

  if (codes.includes("?")) {
    return "border-sky-300/20 bg-sky-400/10 text-sky-100";
  }

  if (codes.includes("D")) {
    return "border-red-300/20 bg-red-400/10 text-red-100";
  }

  if (codes.includes("A")) {
    return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
  }

  if (codes.includes("R")) {
    return "border-amber-300/20 bg-amber-400/10 text-amber-100";
  }

  return "border-cyan-300/20 bg-cyan-400/10 text-cyan-100";
}

export function GitStatusPane({
  busy,
  gitStatus,
  loading,
  selectedPath,
  onSelect
}: GitStatusPaneProps) {
  return (
    <div className="h-[44rem] overflow-hidden rounded-[26px] border border-border bg-[#0b1720] shadow-[0_28px_80px_rgba(3,10,18,0.32)]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#102230] px-5 py-3.5">
        <UiIcon name="activity" className="h-4 w-4 text-[#8ab6cb]" />
        <div className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#8ab6cb]">
          Commit status
        </div>
        {busy || loading ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">
            Checking
          </div>
        ) : null}
      </div>

      <div className="flex h-[calc(44rem-57px)] flex-col bg-[linear-gradient(180deg,#0f2230_0%,#0a141d_100%)] p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <div>
              <p className="text-lg font-semibold text-slate-100">
                Checking repository status
              </p>
              <p className="mt-3 text-sm leading-6 text-[#8fb0bf]">
                Lazify is reading uncommitted file changes from Git.
              </p>
            </div>
          </div>
        ) : null}

        {!loading && gitStatus && !gitStatus.isGitRepo ? (
          <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="max-w-sm">
              <p className="text-lg font-semibold text-slate-100">
                No Git repository detected
              </p>
              <p className="mt-3 text-sm leading-6 text-[#8fb0bf]">
                This synced project does not have a readable Git repository at its current path.
              </p>
            </div>
          </div>
        ) : null}

        {!loading && gitStatus?.isGitRepo ? (
          <>
            <div className="space-y-2">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                {gitStatus.branch ? `Branch: ${gitStatus.branch}` : "Detached HEAD"}
              </div>
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-[#88a7b6]">
                {gitStatus.repoRoot ?? gitStatus.projectPath}
              </div>
            </div>

            <div className="mt-4 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9fc6d8]">
              {gitStatus.entries.length} uncommitted file{gitStatus.entries.length === 1 ? "" : "s"}
            </div>

            {!gitStatus.hasUncommittedChanges ? (
              <div className="mt-4 flex flex-1 items-center justify-center rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                <div>
                  <p className="text-lg font-semibold text-slate-100">
                    Working tree is clean
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#8fb0bf]">
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
                          "w-full rounded-[18px] border px-4 py-3 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5",
                          selected
                            ? "border-cyan-300/40 bg-cyan-400/12 text-cyan-50 shadow-[0_18px_40px_rgba(34,211,238,0.08)]"
                            : "border-white/10 bg-white/[0.03] text-slate-100 hover:bg-white/[0.05]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm">
                              {entry.path}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#8fb0bf]">
                              {entry.stagedStatus === " " ? "-" : entry.stagedStatus} staged · {entry.unstagedStatus === " " ? "-" : entry.unstagedStatus} unstaged
                            </p>
                          </div>

                          <div className={clsx(
                            "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                            getStatusTone(entry)
                          )}>
                            {entry.statusLabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
