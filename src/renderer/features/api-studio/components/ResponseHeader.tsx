import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ResponseHeaderProps {
  open: boolean;
  canSave: boolean;
  canExport: boolean;
  exporting: boolean;
  onToggle: () => void;
  onSave: () => void;
  onExport: () => void;
}

export function ResponseHeader({
  open,
  canSave,
  canExport,
  exporting,
  onToggle,
  onSave,
  onExport
}: Readonly<ResponseHeaderProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex shrink-0 items-center justify-between border-b border-border px-4 py-3",
        open ? null : "border-b-0 border-t"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={t(open ? translation.ApiStudio.CollapseResponse : translation.ApiStudio.ExpandResponse)}
        className="flex items-center gap-1.5 text-xs font-semibold text-text transition-colors hover:text-accent"
      >
        <UiIcon
          name={open ? "collapse" : "expand"}
          className="h-3.5 w-3.5 text-muted"
        />
        {t(translation.ApiStudio.Response)}
      </button>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          title={t(translation.ApiStudio.SaveResponseDesc)}
          className={clsx(
            "flex items-center gap-1.5 text-xs font-medium text-muted transition-colors",
            "hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted"
          )}
        >
          <UiIcon name="pin" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.SaveResponse)}
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={!canExport || exporting}
          title={t(translation.ApiStudio.ExportCollectionDesc)}
          className={clsx(
            "text-xs font-medium text-muted transition-colors hover:text-text",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted"
          )}
        >
          {t(
            exporting ? translation.ApiStudio.Exporting : translation.ApiStudio.ExportCollection
          )}
        </button>
      </div>
    </div>
  );
}
