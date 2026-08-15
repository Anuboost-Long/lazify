import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, PageTitle, SmallText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

type ErrorTone = "error" | "muted" | "accent";

interface ErrorPageLayoutProps {
  icon: UiIconName;
  tone?: ErrorTone;
  /** Already translated: each page owns its own wording. */
  title: string;
  message: string;
  advice?: string;
  failedUrl: string;
  /** Chromium's own words, e.g. `ERR_CONNECTION_REFUSED (-102)`. */
  errorCode?: string;
  /** Buttons this page adds beside the two every page has. */
  extraActions?: ReactNode;
  onRetry: () => void;
  onOpenInSystemBrowser: () => void;
}

const toneClasses: Record<ErrorTone, string> = {
  error: "border-error/30 bg-error/[0.06] text-error",
  muted: "border-border bg-soft text-muted",
  accent: "border-accent/25 bg-accent/[0.08] text-accent"
};

export function ErrorPageLayout({
  icon,
  tone = "error",
  title,
  message,
  advice,
  failedUrl,
  errorCode,
  extraActions,
  onRetry,
  onOpenInSystemBrowser
}: Readonly<ErrorPageLayoutProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-auto px-6 py-10">
      <div className="flex max-w-xl flex-col items-center gap-3">
        <span
          className={clsx(
            "flex h-12 w-12 items-center justify-center rounded-2xl border",
            toneClasses[tone]
          )}
        >
          <UiIcon name={icon} className="h-6 w-6" />
        </span>

        <PageTitle className="text-center">{title}</PageTitle>
        <CaptionText tone="muted" className="text-center">
          {message}
        </CaptionText>

        {advice ? (
          <CaptionText tone="muted" className="text-center opacity-70">
            {advice}
          </CaptionText>
        ) : null}

        {failedUrl ? (
          <SmallText className="!text-muted max-w-full truncate font-mono">{failedUrl}</SmallText>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRetry}
          className={clsx(
            "flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2",
            "transition-transform duration-200",
            "hover:-translate-y-0.5 active:scale-[0.98]"
          )}
        >
          <UiIcon name="refresh-circle" className="h-3.5 w-3.5 text-accent" />
          <SmallText className="!text-accent">{t(translation.Browser.ErrorRetry)}</SmallText>
        </button>

        {extraActions}

        <button
          type="button"
          onClick={onOpenInSystemBrowser}
          className={clsx(
            "flex items-center gap-2 rounded-full border border-border bg-soft px-4 py-2",
            "transition-transform duration-200",
            "hover:-translate-y-0.5 hover:border-accent/50 active:scale-[0.98]"
          )}
        >
          <UiIcon name="open-new-window" className="h-3.5 w-3.5 text-muted" />
          <SmallText className="!text-text">
            {t(translation.Browser.ErrorOpenExternal)}
          </SmallText>
        </button>
      </div>

      {errorCode ? (
        <SmallText className="!text-muted font-mono opacity-60">{errorCode}</SmallText>
      ) : null}
    </div>
  );
}

export function formatErrorCode(description: string, code: number): string | undefined {
  if (!code) return description || undefined;
  return description ? `${description} (${code})` : `${code}`;
}
