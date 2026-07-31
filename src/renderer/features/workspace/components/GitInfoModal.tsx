import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, MonoText, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import type { GitStatusEntry, ProjectGitStatusResult } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

/**
 * Everything git knows about the project, in one sheet.
 *
 * This replaces a strip of four chips that each opened their own modal to show
 * a single value — four clicks to read four fields, and no way to see the
 * branch list or the changed files at all. Sections are separated by hairlines
 * rather than nested cards, so the sheet stays flat.
 */

interface GitInfoModalProps {
  open: boolean;
  onClose: () => void;
  gitStatus: ProjectGitStatusResult | null;
  loading: boolean;
}

function Section({
  icon,
  label,
  children
}: Readonly<{ icon: UiIconName; label: string; children: React.ReactNode }>) {
  return (
    <section className="border-t border-border px-6 py-5 first:border-t-0">
      <div className="mb-3 flex items-center gap-2">
        <UiIcon name={icon} className="h-3.5 w-3.5 shrink-0 text-accent" />
        <OverlineText className="text-muted">{label}</OverlineText>
      </div>
      {children}
    </section>
  );
}

/** A label and a value that may be a long path or URL, so it wraps. */
function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <BodyText className="text-xs text-muted">{label}</BodyText>
      <MonoText className="break-all text-sm text-text">{value}</MonoText>
    </div>
  );
}

function statusTone(entry: GitStatusEntry): string {
  const codes = `${entry.stagedStatus}${entry.unstagedStatus}`;

  if (codes.includes("D")) return "border-error/20 bg-error/10 text-error";
  if (codes.includes("A")) return "border-accent/20 bg-accent/10 text-accent";
  if (codes.includes("R")) return "border-warning/20 bg-warning/10 text-warning";
  if (codes.includes("?")) return "border-border bg-soft text-muted";

  return "border-warning/25 bg-warning/10 text-warning";
}

export function GitInfoModal({ open, onClose, gitStatus, loading }: Readonly<GitInfoModalProps>) {
  const { t } = useTranslation();

  const isRepo = Boolean(gitStatus?.isGitRepo);
  const changeCount = gitStatus?.entries.length ?? 0;

  return (
    <BaseModal open={open} onClose={onClose} contentClassName="p-6 md:p-8">
      <div className="flex max-h-[82vh] w-[min(56rem,calc(100vw-4rem))] flex-col overflow-hidden rounded-[20px] border border-border bg-soft shadow-panel">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-accent">
            <UiIcon name="activity" className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">
              {t(translation.GitStatus.Title)}
            </CardTitle>
            <BodyText className="truncate text-xs text-muted">
              {loading
                ? t(translation.GitStatus.CheckingStatus)
                : isRepo
                  ? (gitStatus?.branch ?? t(translation.GitStatus.DetachedHead))
                  : t(translation.GitStatus.NoLinkedRepo)}
            </BodyText>
          </div>
          <IconButton
            icon="xmark"
            iconClassName="h-4 w-4"
            onClick={onClose}
            aria-label={t(translation.GlobalTerm.CloseModal)}
            className="h-9 w-9 shrink-0 rounded-full border border-border bg-bg text-muted hover:border-accent hover:text-text"
          />
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-bg">
          {loading && !gitStatus ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-muted">
              <UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
              {t(translation.GitStatus.CheckingStatus)}
            </div>
          ) : !isRepo || !gitStatus ? (
            <div className="px-6 py-16 text-center">
              <CardTitle className="text-lg">{t(translation.GitStatus.NoRepo)}</CardTitle>
              <BodyText className="mx-auto mt-2 max-w-sm text-muted">
                {t(translation.GitStatus.NoRepoDesc)}
              </BodyText>
            </div>
          ) : (
            <>
              <Section icon="folder" label={t(translation.GitStatus.GitRepo)}>
                <Field
                  label={t(translation.GitStatus.GitRepo)}
                  value={gitStatus.remoteUrl || t(translation.GlobalTerm.NotAvailable)}
                />
                <Field
                  label={t(translation.ProjectTree.ProjectContents)}
                  value={gitStatus.repoRoot ?? gitStatus.projectPath}
                />
              </Section>

              <Section icon="check-circle" label={t(translation.GitStatus.CurrentBranch)}>
                <div className="flex flex-wrap items-center gap-2">
                  <MonoText className="rounded-lg border border-accent/25 bg-accent/10 px-3 py-1 text-sm text-accent">
                    {gitStatus.branch ?? t(translation.GitStatus.DetachedHead)}
                  </MonoText>
                  <PillText className="text-muted">
                    {t(
                      gitStatus.branches.length === 1
                        ? translation.GitStatus.BranchCountOne
                        : translation.GitStatus.BranchCountMany,
                      { count: gitStatus.branches.length }
                    )}
                  </PillText>
                </div>
              </Section>

              {gitStatus.branches.length > 0 ? (
                <Section icon="activity" label={t(translation.GitStatus.Branches)}>
                  <div className="flex flex-wrap gap-1.5">
                    {gitStatus.branches.map((branch) => (
                      <MonoText
                        key={branch}
                        as="span"
                        className={clsx(
                          "rounded-lg border px-2.5 py-1 text-xs",
                          branch === gitStatus.branch
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-border bg-soft/50 text-muted"
                        )}
                      >
                        {branch}
                      </MonoText>
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section icon="code" label={t(translation.GitStatus.WorkingTree)}>
                {!gitStatus.hasUncommittedChanges ? (
                  <BodyText className="text-sm text-muted">
                    {t(translation.GitStatus.TreeCleanDesc)}
                  </BodyText>
                ) : (
                  <>
                    <PillText className="mb-3 inline-block rounded-full border border-border bg-soft px-3 py-1 text-muted">
                      {t(
                        changeCount === 1
                          ? translation.GitStatus.UncommittedOne
                          : translation.GitStatus.UncommittedMany,
                        { count: changeCount }
                      )}
                    </PillText>

                    <div className="grid gap-1.5">
                      {gitStatus.entries.map((entry) => (
                        <div
                          key={`${entry.absolutePath}-${entry.stagedStatus}-${entry.unstagedStatus}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-soft/40 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <MonoText className="truncate text-sm">{entry.path}</MonoText>
                            <PillText className="mt-0.5 text-muted">
                              {entry.stagedStatus === " " ? "—" : entry.stagedStatus}{" "}
                              {t(translation.GitStatus.Staged)}
                              {" · "}
                              {entry.unstagedStatus === " " ? "—" : entry.unstagedStatus}{" "}
                              {t(translation.GitStatus.Unstaged)}
                            </PillText>
                          </div>
                          <PillText
                            as="span"
                            className={clsx(
                              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                              statusTone(entry)
                            )}
                          >
                            {entry.statusLabel}
                          </PillText>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
