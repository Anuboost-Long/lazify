import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

export function SelectRouteEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <span
          className={clsx(
            "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl",
            "bg-accent/[0.08] text-accent"
          )}
        >
          <UiIcon name="globe" className="h-6 w-6" />
        </span>
        <p className="mt-4 text-base font-semibold text-text">
          {t(translation.ApiStudio.SelectRouteTitle)}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-muted">
          {t(translation.ApiStudio.SelectRouteDescription)}
        </p>
      </div>
    </div>
  );
}
