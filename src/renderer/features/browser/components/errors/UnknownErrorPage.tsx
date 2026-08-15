import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { tabLabel } from "../../lib/browser-url";
import { ErrorPageLayout, formatErrorCode } from "./ErrorPageLayout";
import type { BrowserErrorPageProps } from "./types";

export function UnknownErrorPage({
  error,
  onRetry,
  onOpenInSystemBrowser
}: Readonly<BrowserErrorPageProps>) {
  const { t } = useTranslation();

  return (
    <ErrorPageLayout
      icon="empty-page"
      tone="muted"
      title={t(translation.Browser.ErrorUnknownTitle)}
      message={t(translation.Browser.ErrorUnknownMessage, { host: tabLabel(error.url) })}
      failedUrl={error.url}
      errorCode={formatErrorCode(error.description, error.code)}
      onRetry={onRetry}
      onOpenInSystemBrowser={onOpenInSystemBrowser}
    />
  );
}
