import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { DiffModeToggle } from "@renderer/shared/ui/code/diff/DiffModeToggle";
import type { DiffViewMode } from "@renderer/shared/ui/code/diff/DiffView";
import { PreviewModeToggle } from "@renderer/shared/ui/code/preview/PreviewModeToggle";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";

interface ProjectTreeEditorToolbarProps {
  action?: ReactNode;
  diffMode?: DiffViewMode;
  onDiffModeChange?: (mode: DiffViewMode) => void;
  svgMode?: "preview" | "code";
  onSvgModeChange?: (mode: "preview" | "code") => void;
  onCloseAll?: () => void;
  openTabCount?: number;
  hasTabs: boolean;
}

export function ProjectTreeEditorToolbar({
  action,
  diffMode,
  onDiffModeChange,
  svgMode,
  onSvgModeChange,
  onCloseAll,
  openTabCount = 0,
  hasTabs,
}: Readonly<ProjectTreeEditorToolbarProps>) {
  const { t } = useTranslation();
  const [confirmCloseAll, setConfirmCloseAll] = useState(false);

  return (
    <>
      {action}

      {diffMode && onDiffModeChange ? (
        <DiffModeToggle value={diffMode} onChange={onDiffModeChange} />
      ) : null}

      {svgMode && onSvgModeChange ? (
        <PreviewModeToggle
          value={svgMode}
          onChange={onSvgModeChange}
          options={[
            { id: "preview", label: t(translation.ProjectTree.PreviewImage) },
            { id: "code", label: t(translation.ProjectTree.PreviewCode) },
          ]}
        />
      ) : null}

      {onCloseAll && hasTabs ? (
        <Tooltip content={t(translation.ProjectTree.CloseAllTabs)} side="bottom">
          <button
            type="button"
            onClick={() => setConfirmCloseAll(true)}
            aria-label={t(translation.ProjectTree.CloseAllTabs)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-error/10 hover:text-error"
          >
            <UiIcon name="xmark" className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      ) : null}

      <ConfirmModal
        open={confirmCloseAll}
        title={t(translation.ProjectTree.CloseAllTabsTitle)}
        description={t(translation.ProjectTree.CloseAllTabsDesc, {
          count: openTabCount,
        })}
        confirmLabel={t(translation.ProjectTree.CloseAllTabs)}
        destructive
        onConfirm={() => {
          onCloseAll?.();
          setConfirmCloseAll(false);
        }}
        onCancel={() => setConfirmCloseAll(false)}
      />
    </>
  );
}
