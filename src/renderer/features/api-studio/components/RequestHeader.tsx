import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { RequestStorage } from "../types";

interface RequestHeaderProps {
  storageLocation: RequestStorage | null;
  sending: boolean;
  sendable: boolean;
  hasBaseUrl: boolean;
  onOpenStorage: () => void;
  onSend: () => void;
}

function storageLabel(location: RequestStorage | null) {
  switch (location) {
    case "app":
      return translation.ApiStudio.StorageOnMachine;
    case "project":
      return translation.ApiStudio.StorageInProject;
    default:
      return translation.ApiStudio.StorageUnset;
  }
}

export function RequestHeader({
  storageLocation,
  sending,
  sendable,
  hasBaseUrl,
  onOpenStorage,
  onSend
}: Readonly<RequestHeaderProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <span className="text-xs font-semibold text-text">{t(translation.ApiStudio.Request)}</span>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenStorage}
          className="text-[11px] font-medium text-muted transition-colors hover:text-text"
        >
          {t(storageLabel(storageLocation))}
        </button>

        <button
          type="button"
          onClick={onSend}
          disabled={!sendable || sending}
          title={hasBaseUrl ? undefined : t(translation.ApiStudio.SetBaseUrl)}
          className={clsx(
            "flex h-7 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-bg",
            "transition-colors hover:bg-accentHover",
            "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-accent"
          )}
        >
          <UiIcon name="play" className="h-3.5 w-3.5" />
          {t(sending ? translation.ApiStudio.Sending : translation.ApiStudio.Send)}
        </button>
      </div>
    </div>
  );
}
