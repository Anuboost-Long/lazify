import { useState } from "react";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, OverlineText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import type { ProjectGitStatusResult } from "@renderer/shared/types/lazify";
import { useTranslation } from "react-i18next";

interface InfoChipProps {
  icon: UiIconName;
  label: string;
  value: string;
}

function InfoChip({
  icon,
  label,
  value
}: InfoChipProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-w-[12rem] items-center gap-3 rounded-[18px] border border-border bg-bg px-4 py-3 text-left"
        title={value}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-soft text-accent">
          <UiIcon name={icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <OverlineText className="text-muted">
            {label}
          </OverlineText>
          <CardTitle className="truncate text-sm">
            {value}
          </CardTitle>
        </div>
      </button>
      <BaseModal
        open={open}
        onClose={() => setOpen(false)}
        contentClassName="p-6 md:p-8"
      >
        <div className="mx-auto w-full max-w-lg rounded-[24px] border border-border bg-soft p-6 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-bg text-accent">
                <UiIcon name={icon} className="h-5 w-5" />
              </div>
              <div>
                <OverlineText className="text-muted">
                  {label}
                </OverlineText>
                <CardTitle className="mt-1 text-lg">
                  {t(translation.Workspace.FullInformation)}
                </CardTitle>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg text-muted hover:border-accent hover:text-text"
              aria-label={`Close ${label}`}
            >
              <UiIcon name="xmark" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 rounded-[18px] border border-border bg-bg px-4 py-4">
            <BodyText className="whitespace-pre-wrap break-words text-text">
              {value}
            </BodyText>
          </div>
        </div>
      </BaseModal>
    </>
  );
}

interface ProjectInfoStripProps {
  gitStatus: ProjectGitStatusResult | null;
  loading: boolean;
}

export function ProjectInfoStrip({
  gitStatus,
  loading
}: ProjectInfoStripProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoChip icon="refresh-circle" label={t(translation.GitStatus.GitRepo)} value={t(translation.GitStatus.CheckingRepo)} />
        <InfoChip icon="activity" label={t(translation.GitStatus.Branches)} value={t(translation.GitStatus.CheckingBranches)} />
        <InfoChip icon="check-circle" label={t(translation.GitStatus.CurrentBranch)} value={t(translation.GitStatus.CheckingBranch)} />
        <InfoChip icon="code" label={t(translation.GitStatus.WorkingTree)} value={t(translation.GitStatus.CheckingStatusShort)} />
      </div>
    );
  }

  if (!gitStatus?.isGitRepo) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoChip icon="folder" label={t(translation.GitStatus.GitRepo)} value={t(translation.GitStatus.NoLinkedRepo)} />
        <InfoChip icon="activity" label={t(translation.GitStatus.Branches)} value={t(translation.GlobalTerm.Unavailable)} />
        <InfoChip icon="check-circle" label={t(translation.GitStatus.CurrentBranch)} value={t(translation.GlobalTerm.Unavailable)} />
        <InfoChip icon="code" label={t(translation.GitStatus.WorkingTree)} value={t(translation.GlobalTerm.Unavailable)} />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <InfoChip
        icon="folder"
        label={t(translation.GitStatus.GitRepo)}
        value={gitStatus.remoteUrl || t(translation.GlobalTerm.NotAvailable)}
      />
      <InfoChip
        icon="activity"
        label={t(translation.GitStatus.Branches)}
        value={t(gitStatus.branches.length === 1 ? translation.GitStatus.BranchCountOne : translation.GitStatus.BranchCountMany, { count: gitStatus.branches.length })}
      />
      <InfoChip
        icon="check-circle"
        label={t(translation.GitStatus.CurrentBranch)}
        value={gitStatus.branch ?? t(translation.GitStatus.DetachedHead)}
      />
      <InfoChip
        icon="code"
        label={t(translation.GitStatus.WorkingTree)}
        value={gitStatus.hasUncommittedChanges ? t(gitStatus.entries.length === 1 ? translation.GitStatus.UncommittedOne : translation.GitStatus.UncommittedMany, { count: gitStatus.entries.length }) : t(translation.GitStatus.Clean)}
      />
    </div>
  );
}
