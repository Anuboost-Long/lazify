import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";

interface PostmanDialectNoticeProps {
  globalName: string;
  onSwitch: () => void;
  onDismiss: () => void;
}

export function PostmanDialectNotice({
  globalName,
  onSwitch,
  onDismiss
}: Readonly<PostmanDialectNoticeProps>) {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning/[0.06] px-3 py-2.5"
      )}
    >
      <p className="text-[11px] leading-5 text-text">
        {t(translation.ApiStudio.PostmanDetected, { global: globalName })}
      </p>
      <p className="text-[11px] leading-5 text-muted">
        {t(translation.ApiStudio.PostmanDetectedDetail)}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSwitch}
          className={clsx(
            "rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-bg",
            "transition-opacity hover:opacity-90"
          )}
        >
          {t(translation.ApiStudio.UsePostmanNames)}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] font-medium text-muted transition-colors hover:text-text"
        >
          {t(translation.ApiStudio.KeepThisDialect, { global: globalName })}
        </button>
      </div>
    </div>
  );
}
