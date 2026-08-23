import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface ResponseFileCardProps {
  file: { path: string; name: string };
  mediaType: string | null;
  size: string;
}

const ACTION = clsx(
  "flex h-8 items-center gap-1.5 rounded-lg border border-border px-3",
  "text-xs font-medium text-text transition-colors hover:border-accent/40",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function ResponseFileCard({ file, mediaType, size }: Readonly<ResponseFileCardProps>) {
  const { t } = useTranslation();
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const save = () => {
    setFailure(null);

    void globalThis.lazify
      .saveResponseFile(file.path, file.name)
      .then(setSavedTo)
      .catch(() => setFailure(t(translation.ApiStudio.FileGone)));
  };

  const open = () => {
    setFailure(null);

    void globalThis.lazify
      .openResponseFile(file.path)
      .then((problem) => setFailure(problem ? t(translation.ApiStudio.FileGone) : null))
      .catch(() => setFailure(t(translation.ApiStudio.FileGone)));
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span
        className={clsx(
          "flex h-12 w-12 items-center justify-center rounded-2xl border border-border",
          "bg-bg/45 text-accent"
        )}
      >
        <UiIcon name="empty-page" className="h-5 w-5" />
      </span>

      <div className="flex flex-col gap-1">
        <span className="break-all text-xs font-semibold text-text">{file.name}</span>
        <span className="text-[11px] text-muted">
          {[mediaType?.split(";")[0], size].filter(Boolean).join(" · ")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={save} className={ACTION}>
          <UiIcon name="download" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.SaveFile)}
        </button>

        <button type="button" onClick={open} className={ACTION}>
          <UiIcon name="open-new-window" className="h-3.5 w-3.5" />
          {t(translation.ApiStudio.OpenFile)}
        </button>
      </div>

      {savedTo ? (
        <span className="break-all text-[11px] text-success">
          {t(translation.ApiStudio.FileSavedTo, { path: savedTo })}
        </span>
      ) : null}
      {failure ? <span className="text-[11px] text-error">{failure}</span> : null}
    </div>
  );
}
