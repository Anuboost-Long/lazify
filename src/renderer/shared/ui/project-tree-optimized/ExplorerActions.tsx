import clsx from "clsx";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useTranslation } from "react-i18next";

/**
 * New-file and new-folder buttons for the explorer.
 *
 * Extracted so there is a single definition for the two places they appear:
 * the standalone explorer card's own header, and the workbench sidebar's tab
 * strip, where the sidebar draws the header instead.
 */

interface ExplorerActionsProps {
  onCreateEntry: (type: "file" | "folder") => void;
  /** Smaller, flatter buttons for the sidebar tab strip. */
  compact?: boolean;
}

export function ExplorerActions({
  onCreateEntry,
  compact = false
}: Readonly<ExplorerActionsProps>) {
  const { t } = useTranslation();

  const className = compact
    ? "flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
    : "flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent transition-colors hover:border-accent/50 hover:bg-accent/20";

  const iconClassName = clsx(compact ? "h-3.5 w-3.5" : "h-4 w-4");

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCreateEntry("file");
        }}
        className={className}
        aria-label={t(translation.ProjectTree.NewFile)}
        title={t(translation.ProjectTree.NewFile)}
      >
        <UiIcon name="plus" className={iconClassName} />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onCreateEntry("folder");
        }}
        className={className}
        aria-label={t(translation.ProjectTree.NewFolder)}
        title={t(translation.ProjectTree.NewFolder)}
      >
        <UiIcon name="folder" className={iconClassName} />
      </button>
    </>
  );
}
