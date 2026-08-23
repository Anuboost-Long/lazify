import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface CollectionEmptyStateProps {
  hasProject: boolean;
  scanning: boolean;
  scanError: string | null;
  searching: boolean;
  onSyncProject: () => Promise<SyncedWorkspaceProject | null>;
}

export function CollectionEmptyState({
  hasProject,
  scanning,
  scanError,
  searching,
  onSyncProject
}: Readonly<CollectionEmptyStateProps>) {
  const { t } = useTranslation();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncProject = async () => {
    try {
      setSyncError(null);
      setSyncing(true);
      await onSyncProject();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : t(translation.Workspace.SyncError));
    } finally {
      setSyncing(false);
    }
  };

  if (scanning) {
    return (
      <p className="m-auto flex items-center gap-2 py-6 text-xs text-muted">
        <UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin" />
        {t(translation.ApiStudio.Scanning)}
      </p>
    );
  }

  if (scanError) {
    return (
      <div className="m-auto max-w-[240px] py-6 text-center">
        <span
          className={clsx(
            "mx-auto flex h-10 w-10 items-center justify-center rounded-xl",
            "border border-error/25 bg-error/[0.06] text-error"
          )}
        >
          <UiIcon name="warning-triangle" className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-text">
          {t(translation.ApiStudio.ScanFailed)}
        </p>
        <p className="mt-1.5 text-xs leading-5 text-muted">{scanError}</p>
      </div>
    );
  }

  if (searching) {
    return (
      <p className="m-auto py-6 text-center text-xs text-muted">
        {t(translation.ApiStudio.NoMatchingRoutes)}
      </p>
    );
  }

  return (
    <div className="m-auto max-w-[220px] py-6 text-center">
      <span
        className={clsx(
          "mx-auto flex h-10 w-10 items-center justify-center rounded-xl",
          "border border-border bg-text/[0.025] text-muted"
        )}
      >
        <UiIcon name={hasProject ? "code" : "folder"} className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-text">
        {t(
          hasProject
            ? translation.ApiStudio.NoRoutesTitle
            : translation.ApiStudio.SyncProjectFirst
        )}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-muted">
        {t(
          hasProject
            ? translation.ApiStudio.NoRoutesDescription
            : translation.ApiStudio.SyncProjectDescription
        )}
      </p>
      {!hasProject ? (
        <>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void syncProject()}
            className={clsx(
              "mx-auto mt-4 flex h-9 items-center gap-2 rounded-lg bg-accent px-3.5",
              "text-xs font-semibold text-bg transition-colors",
              "hover:bg-accentHover disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <UiIcon
              name="refresh-circle"
              className={clsx("h-3.5 w-3.5", syncing && "animate-spin")}
            />
            {t(translation.Workspace.SyncProject)}
          </button>
          {syncError ? <p className="mt-2 text-xs leading-5 text-error">{syncError}</p> : null}
        </>
      ) : null}
    </div>
  );
}
