import { useState } from "react";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import type { ProjectGitStatusResult } from "@renderer/shared/types/lazify";

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
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {label}
          </p>
          <p className="truncate text-sm font-semibold text-text">
            {value}
          </p>
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
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {label}
                </p>
                <p className="mt-1 text-lg font-semibold text-text">
                  Full information
                </p>
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
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-text">
              {value}
            </p>
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
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoChip icon="refresh-circle" label="Git repo" value="Checking repository..." />
        <InfoChip icon="activity" label="Branches" value="Checking branches..." />
        <InfoChip icon="check-circle" label="Current branch" value="Checking branch..." />
        <InfoChip icon="code" label="Working tree" value="Checking status..." />
      </div>
    );
  }

  if (!gitStatus?.isGitRepo) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InfoChip icon="folder" label="Git repo" value="No linked repository" />
        <InfoChip icon="activity" label="Branches" value="Unavailable" />
        <InfoChip icon="check-circle" label="Current branch" value="Unavailable" />
        <InfoChip icon="code" label="Working tree" value="Unavailable" />
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <InfoChip
        icon="folder"
        label="Git repo"
        value={gitStatus.remoteUrl || "N/A"}
      />
      <InfoChip
        icon="activity"
        label="Branches"
        value={`${gitStatus.branches.length} branch${gitStatus.branches.length === 1 ? "" : "es"}`}
      />
      <InfoChip
        icon="check-circle"
        label="Current branch"
        value={gitStatus.branch ?? "Detached HEAD"}
      />
      <InfoChip
        icon="code"
        label="Working tree"
        value={gitStatus.hasUncommittedChanges ? `${gitStatus.entries.length} uncommitted file${gitStatus.entries.length === 1 ? "" : "s"}` : "Clean"}
      />
    </div>
  );
}
