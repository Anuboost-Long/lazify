import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { translation } from "@renderer/i18n/translation";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ProjectTreeActionsProps {
  onCreateEntry: (type: "file" | "folder") => void;
  compact?: boolean;
}

export function ProjectTreeActions({
  onCreateEntry,
  compact = false,
}: Readonly<ProjectTreeActionsProps>) {
  const { t } = useTranslation();
  const className = compact
    ? "flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-accent/10 hover:text-accent"
    : "flex h-8 w-8 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent transition-colors hover:border-accent/50 hover:bg-accent/20";
  const iconClassName = clsx(compact ? "h-3.5 w-3.5" : "h-4 w-4");

  return (
    <>
      <Tooltip content={t(translation.ProjectTree.NewFile)} side="bottom">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCreateEntry("file");
          }}
          className={className}
          aria-label={t(translation.ProjectTree.NewFile)}
        >
          <UiIcon name="plus" className={iconClassName} />
        </button>
      </Tooltip>
      <Tooltip content={t(translation.ProjectTree.NewFolder)} side="bottom">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCreateEntry("folder");
          }}
          className={className}
          aria-label={t(translation.ProjectTree.NewFolder)}
        >
          <UiIcon name="folder" className={iconClassName} />
        </button>
      </Tooltip>
    </>
  );
}
