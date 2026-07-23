import clsx from "clsx";
import { useState } from "react";
import { BranchSwitcher } from "@renderer/features/workspace/components/BranchSwitcher";
import { GitStatusGroup } from "@renderer/features/workspace/components/git-status/GitStatusGroup";
import { GitStatusList } from "@renderer/features/workspace/components/git-status/GitStatusList";
import { groupEntries } from "@renderer/features/workspace/components/git-status/group-entries";
import { CommitBox } from "@renderer/features/workspace/components/git-status/CommitBox";
import { RowAction } from "@renderer/features/workspace/components/git-status/RowAction";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import { GitStatusTree } from "@renderer/features/workspace/components/git-status/GitStatusTree";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, MonoText, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { GitStatusEntry, ProjectGitStatusResult } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface GitStatusPaneProps {
  busy: boolean;
  gitStatus: ProjectGitStatusResult | null;
  loading: boolean;
  selectedPath: string | null;
  onSelect: (entry: GitStatusEntry) => void;
  projectPath: string;
  onBranchSwitched: () => void;
  /** "flush" fills a frame that already owns the border and height. */
  chrome?: "card" | "flush";
  /** False when a sidebar shell owns the header. */
  showHeader?: boolean;
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
  projectPath,
  onBranchSwitched,
  chrome = "card",
  showHeader = true,
}: GitStatusPaneProps) {
  const { t } = useTranslation();
  const flush = chrome === "flush";
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  // Discard destroys uncommitted work, so it is the one action behind a gate.
  const [pendingDiscard, setPendingDiscard] = useState<GitStatusEntry[] | null>(null);

  const runAction = async (
    action: (paths: string[]) => Promise<{ success: boolean; message: string }>,
    entries: GitStatusEntry[]
  ) => {
    if (entries.length === 0) return;

    const result = await action(entries.map((entry) => entry.path));
    if (result.success) onBranchSwitched();
  };

  const stage = (entries: GitStatusEntry[]) =>
    void runAction((paths) => globalThis.lazify.stageFiles(projectPath, paths), entries);
  const unstage = (entries: GitStatusEntry[]) =>
    void runAction((paths) => globalThis.lazify.unstageFiles(projectPath, paths), entries);
  const discard = (entries: GitStatusEntry[]) =>
    void runAction((paths) => globalThis.lazify.discardChanges(projectPath, paths), entries);

  return (
    <div
      className={clsx(
        "flex flex-col overflow-hidden bg-bg",
        flush ? "h-full" : "h-[44rem] rounded-[26px] border border-border shadow-panel"
      )}
    >

      {/* Header */}
      <div
        className={clsx(
          "flex shrink-0 items-center gap-2 border-b border-border bg-soft",
          flush ? "px-4 py-2.5" : "px-5 py-3.5"
        )}
      >
        <UiIcon name="activity" className="h-4 w-4 text-muted" />
        <OverlineText className="min-w-0 flex-1 text-muted">
          {t(translation.GitStatus.Title)}
        </OverlineText>
        {(busy || loading) && (
          <PillText className="text-accent">
            {t(translation.GlobalTerm.Checking)}
          </PillText>
        )}
        {/* Flat list or folder tree, the way source control views let you
            choose once a change set gets deep. */}
        <button
          type="button"
          onClick={() => setViewMode((current) => (current === "list" ? "tree" : "list"))}
          title={t(viewMode === "list" ? translation.GitStatus.ViewAsTree : translation.GitStatus.ViewAsList)}
          aria-label={t(viewMode === "list" ? translation.GitStatus.ViewAsTree : translation.GitStatus.ViewAsList)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
        >
          <UiIcon name={viewMode === "list" ? "folder" : "menu"} className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className={clsx("flex min-h-0 flex-1 flex-col bg-bg", flush ? "p-3" : "p-4")}>

        {/* Initial load — no data yet */}
        {loading && !gitStatus && (
          <div className={clsx("flex h-full items-center justify-center p-8 text-center", !flush && "rounded-[20px] border border-dashed border-border bg-soft/30")}>
            <div>
              <CardTitle className="text-lg">{t(translation.GitStatus.CheckingStatus)}</CardTitle>
              <BodyText className="mt-3 text-muted">
                {t(translation.GitStatus.CheckingDesc)}
              </BodyText>
            </div>
          </div>
        )}

        {/* Not a git repo */}
        {!loading && gitStatus && !gitStatus.isGitRepo && (
          <div className={clsx("flex h-full items-center justify-center p-8 text-center", !flush && "rounded-[20px] border border-dashed border-border bg-soft/30")}>
            <div className="max-w-sm">
              <CardTitle className="text-lg">{t(translation.GitStatus.NoRepo)}</CardTitle>
              <BodyText className="mt-3 text-muted">
                {t(translation.GitStatus.NoRepoDesc)}
              </BodyText>
            </div>
          </div>
        )}

        {/* Git repo — branch info always visible, list area shows loading or entries */}
        {gitStatus?.isGitRepo && (
          <>
            {/* One row instead of two stacked boxes: the branch, switchable,
                with the repo path as its hover title. */}
            <BranchSwitcher
              projectPath={projectPath}
              branch={gitStatus.branch}
              branches={gitStatus.branches}
              repoRoot={gitStatus.repoRoot ?? gitStatus.projectPath}
              disabled={busy || loading}
              onSwitched={onBranchSwitched}
            />

            <div className="mt-2">
              <CommitBox
                projectPath={projectPath}
                branch={gitStatus.branch}
                stagedCount={groupEntries(gitStatus.entries).staged.length}
                disabled={busy || loading}
                onChanged={onBranchSwitched}
              />
            </div>

            {loading ? (
              <div className="mt-5 flex flex-1 items-center justify-center gap-2 text-sm text-muted">
                <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
                {t(translation.GitStatus.Refreshing)}
              </div>
            ) : !gitStatus.hasUncommittedChanges ? (
              <div className={clsx("mt-4 flex flex-1 items-center justify-center p-8 text-center", !flush && "rounded-[20px] border border-dashed border-border bg-soft/30")}>
                <div>
                  <CardTitle className="text-lg">{t(translation.GitStatus.TreeClean)}</CardTitle>
                  <BodyText className="mt-3 text-muted">
                    {t(translation.GitStatus.TreeCleanDesc)}
                  </BodyText>
                </div>
              </div>
            ) : (
              <div className="mt-1 min-h-0 flex-1 space-y-1 overflow-y-auto">
                {(() => {
                  const groups = groupEntries(gitStatus.entries);

                  const renderEntries = (
                    entries: GitStatusEntry[],
                    group: "staged" | "unstaged"
                  ) => {
                    const shared = {
                      entries,
                      selectedPath,
                      group,
                      onSelect,
                      onStage: (entry: GitStatusEntry) => stage([entry]),
                      onUnstage: (entry: GitStatusEntry) => unstage([entry]),
                      onDiscard: (entry: GitStatusEntry) => setPendingDiscard([entry])
                    };

                    return viewMode === "list" ? (
                      <GitStatusList {...shared} />
                    ) : (
                      <GitStatusTree {...shared} />
                    );
                  };

                  return (
                    <>
                      <GitStatusGroup
                        label={t(translation.GitStatus.StagedChanges)}
                        count={groups.staged.length}
                        actions={
                          <RowAction
                            icon="arrow-left"
                            label={translation.GitStatus.UnstageAll}
                            onClick={() => unstage(groups.staged)}
                          />
                        }
                      >
                        {renderEntries(groups.staged, "staged")}
                      </GitStatusGroup>

                      <GitStatusGroup
                        label={t(translation.GitStatus.Changes)}
                        count={groups.unstaged.length}
                        actions={
                          <RowAction
                            icon="plus"
                            label={translation.GitStatus.StageAll}
                            onClick={() => stage(groups.unstaged)}
                          />
                        }
                      >
                        {renderEntries(groups.unstaged, "unstaged")}
                      </GitStatusGroup>
                    </>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={pendingDiscard !== null}
        title={t(translation.GitStatus.DiscardTitle)}
        description={t(translation.GitStatus.DiscardDesc, {
          name: pendingDiscard?.map((entry) => entry.path).join(", ") ?? ""
        })}
        confirmLabel={t(translation.GitStatus.Discard)}
        destructive
        onConfirm={() => {
          if (pendingDiscard) discard(pendingDiscard);
          setPendingDiscard(null);
        }}
        onCancel={() => setPendingDiscard(null)}
      />
    </div>
  );
}
