import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BodyText, MonoText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SectionLabel } from "./SectionLabel";

type Paths = Awaited<ReturnType<typeof globalThis.lazify.getDiagnosticsPaths>>;

/** Where bug reports go. Change this and the button follows. */
const ISSUES_URL = "https://github.com/Anuboost-Long/lazify-dist/issues/new";

const ACTION_BUTTON = clsx(
  "flex items-center gap-1.5 rounded-[14px] border border-border bg-bg px-3 py-1.5",
  "text-xs font-semibold text-muted transition-colors duration-150",
  "hover:border-accent/30 hover:text-text",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

export function DiagnosticsSection() {
  const { t } = useTranslation();
  const [paths, setPaths] = useState<Paths | null>(null);

  useEffect(() => {
    let cancelled = false;

    void globalThis.lazify
      .getDiagnosticsPaths()
      .then((result) => {
        if (!cancelled) setPaths(result);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Opens a new issue with the build already filled in. Version, platform and
   * arch are the first three questions any report needs answered, and asking
   * the reporter for them is how you end up never getting them.
   */
  const reportIssue = () => {
    const body = paths
      ? [
          "",
          "",
          "---",
          `Lazify ${paths.appVersion} · ${paths.platform}/${paths.arch} · Electron ${paths.electronVersion}`,
        ].join("\n")
      : "";

    void globalThis.lazify.openExternalUrl(
      `${ISSUES_URL}?body=${encodeURIComponent(body)}`
    );
  };

  return (
    <div className="border-t border-border pt-6">
      <SectionLabel>{t(translation.Settings.Diagnostics)}</SectionLabel>

      <div className="rounded-2xl border border-border bg-soft px-5 py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <BodyText className="font-semibold">{t(translation.Settings.LogFile)}</BodyText>
            <MonoText className="mt-1 block truncate !text-muted">
              {paths?.logFile ?? "…"}
            </MonoText>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={!paths}
              onClick={() => {
                if (paths) void globalThis.lazify.revealInFileManager(paths.logFile);
              }}
              className={ACTION_BUTTON}
            >
              <UiIcon name="folder" className="h-3.5 w-3.5" />
              {t(translation.Settings.RevealLogs)}
            </button>

            <button type="button" onClick={reportIssue} className={ACTION_BUTTON}>
              <UiIcon name="bug" className="h-3.5 w-3.5" />
              {t(translation.Settings.ReportIssue)}
            </button>
          </div>
        </div>

        <SmallText className="mt-3 block leading-5">
          {t(translation.Settings.DiagnosticsDesc)}
        </SmallText>
      </div>
    </div>
  );
}
