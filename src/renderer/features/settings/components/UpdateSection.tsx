import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import { useAppUpdate } from "../hooks/use-app-update";
import { SectionLabel } from "./SectionLabel";

const ACTION_BUTTON = clsx(
  "flex items-center gap-1.5 rounded-[14px] border border-border bg-bg px-3 py-1.5",
  "text-xs font-semibold text-muted transition-colors duration-150",
  "hover:border-accent/30 hover:text-text",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function UpdateSection() {
  const { t } = useTranslation();
  const { state, check, download, install } = useAppUpdate();
  const [confirmInstall, setConfirmInstall] = useState(false);

  const busy = state.status === "checking" || state.status === "downloading";
  const percent = state.status === "downloading" ? Math.round(state.percent) : 0;

  const message = () => {
    switch (state.status) {
      case "checking":
        return t(translation.Settings.UpdateChecking);
      case "current":
        return t(translation.Settings.UpdateCurrent, { version: state.version });
      case "available":
        return t(translation.Settings.UpdateAvailable, { version: state.version });
      case "downloading":
        return `${t(translation.Settings.UpdateDownloading)} ${percent}%`;
      case "downloaded":
        return t(translation.Settings.UpdateDownloaded, { version: state.version });
      case "error":
        return `${t(translation.Settings.UpdateError)} — ${state.message}`;
      case "unsupported":
        // A .deb or .rpm is not a broken updater — it is one owned by apt.
        return state.reason === "package-manager"
          ? t(translation.Settings.UpdateUnsupportedPackageManager)
          : t(translation.Settings.UpdateUnsupported);
      default:
        return t(translation.Settings.UpdateIdle);
    }
  };

  return (
    <>
      <div className="border-t border-border pt-6">
        <SectionLabel>{t(translation.Settings.Updates)}</SectionLabel>

        <div className="rounded-2xl border border-border bg-soft px-5 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="min-w-0 flex-1">
              <BodyText
                className={clsx("font-semibold", state.status === "error" && "!text-error")}
              >
                {message()}
              </BodyText>
              {state.status === "downloading" ? (
                <SmallText className="mt-0.5 leading-5">
                  {formatBytes(state.transferred)} / {formatBytes(state.total)}
                </SmallText>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Installing restarts the app, so it never shares a click with
                  downloading — the user opts into each step separately. */}
              {state.status === "downloaded" ? (
                <button
                  type="button"
                  onClick={() => setConfirmInstall(true)}
                  className={clsx(ACTION_BUTTON, "!border-accent/40 !text-accent")}
                >
                  <UiIcon name="refresh-circle" className="h-3.5 w-3.5" />
                  {t(translation.Settings.UpdateRestart)}
                </button>
              ) : state.status === "available" ? (
                <button type="button" onClick={download} className={ACTION_BUTTON}>
                  <UiIcon name="download" className="h-3.5 w-3.5" />
                  {t(translation.Settings.UpdateDownload)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={check}
                  disabled={busy || state.status === "unsupported"}
                  className={ACTION_BUTTON}
                >
                  <UiIcon
                    name="refresh-circle"
                    className={clsx("h-3.5 w-3.5", busy && "animate-spin")}
                  />
                  {t(translation.Settings.UpdateCheck)}
                </button>
              )}
            </div>
          </div>

          {state.status === "downloading" ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={confirmInstall}
        title={t(translation.Settings.UpdateInstallTitle)}
        description={t(translation.Settings.UpdateInstallDesc)}
        confirmLabel={t(translation.Settings.UpdateRestart)}
        destructive
        onConfirm={install}
        onCancel={() => setConfirmInstall(false)}
      />
    </>
  );
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
