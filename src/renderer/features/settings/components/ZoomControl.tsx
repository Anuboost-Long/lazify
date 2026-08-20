import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { useAppZoom } from "@renderer/shared/hooks/use-app-zoom";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

const STEP = "flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-accent/40 hover:text-text disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border";

export function ZoomControl() {
  const { t } = useTranslation();
  const { zoom, zoomIn, zoomOut, resetZoom } = useAppZoom();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={zoomOut}
        disabled={zoom <= 0.5}
        aria-label={t(translation.Settings.ZoomOut)}
        className={STEP}
      >
        <UiIcon name="collapse" className="h-4 w-4" />
      </button>

      <span className="w-14 text-center text-xs font-semibold tabular-nums text-text">
        {Math.round(zoom * 100)}%
      </span>

      <button
        type="button"
        onClick={zoomIn}
        disabled={zoom >= 2}
        aria-label={t(translation.Settings.ZoomIn)}
        className={STEP}
      >
        <UiIcon name="expand" className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={resetZoom}
        disabled={zoom === 1}
        className={clsx(
          "h-8 rounded-lg border border-border px-3 text-xs font-medium text-text",
          "transition-colors hover:border-accent/40",
          "disabled:cursor-not-allowed disabled:text-muted disabled:opacity-55"
        )}
      >
        {t(translation.Settings.ZoomReset)}
      </button>
    </div>
  );
}
