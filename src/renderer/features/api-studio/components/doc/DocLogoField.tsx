import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface DocLogoFieldProps {
  logo: string;
  /** Inside a labelled settings row, the field carries no heading of its own. */
  bare?: boolean;
  onChange: (logo: string) => void;
}

export function DocLogoField({ logo, bare = false, onChange }: Readonly<DocLogoFieldProps>) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);

  const pick = () => {
    setPicking(true);
    void globalThis.lazify
      .chooseDocLogo()
      .then((picked) => {
        if (picked) onChange(picked);
      })
      .catch(() => undefined)
      .finally(() => setPicking(false));
  };

  return (
    <div className="flex flex-col gap-2">
      {bare ? null : (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          {t(translation.ApiStudio.DocLogo)}
        </span>
      )}

      <div className="flex items-center gap-3">
        <div
          className={clsx(
            "flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg",
            "border border-dashed border-border bg-bg/45"
          )}
        >
          {logo ? (
            <img src={logo} alt="" className="max-h-7 max-w-[3.5rem] object-contain" />
          ) : (
            <UiIcon name="media-image" className="h-4 w-4 text-muted/70" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={picking}
            onClick={pick}
            className={clsx(
              "flex h-9 items-center gap-1.5 rounded-lg border border-border bg-bg px-3",
              "text-[11px] font-medium text-text transition-colors hover:border-accent/40",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <UiIcon name="plus" className="h-3.5 w-3.5" />
            {logo ? t(translation.ApiStudio.DocReplaceLogo) : t(translation.ApiStudio.DocAddLogo)}
          </button>

          {logo ? (
            <button
              type="button"
              onClick={() => onChange("")}
              className={clsx(
                "h-9 rounded-lg border border-border px-3 text-[11px] font-medium text-muted",
                "transition-colors hover:border-error/40 hover:text-text"
              )}
            >
              {t(translation.ApiStudio.DocRemoveLogo)}
            </button>
          ) : null}
        </div>
      </div>

      {bare ? null : (
        <span className="text-[11px] leading-5 text-muted">
          {t(translation.ApiStudio.DocLogoHint)}
        </span>
      )}
    </div>
  );
}
