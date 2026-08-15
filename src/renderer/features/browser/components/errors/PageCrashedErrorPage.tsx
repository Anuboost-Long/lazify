import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { ErrorPageLayout, formatErrorCode } from "./ErrorPageLayout";
import type { BrowserErrorPageProps } from "./types";

export function PageCrashedErrorPage({
  error,
  onRetry,
  onOpenInSystemBrowser
}: Readonly<BrowserErrorPageProps>) {
  const { t } = useTranslation();

  return (
    <ErrorPageLayout
      icon="bug"
      title={t(translation.Browser.ErrorPageCrashedTitle)}
      message={t(translation.Browser.ErrorPageCrashedMessage)}
      advice={t(translation.Browser.ErrorPageCrashedAdvice)}
      failedUrl={error.url}
      errorCode={formatErrorCode(error.description, error.code)}
      onRetry={onRetry}
      onOpenInSystemBrowser={onOpenInSystemBrowser}
    />
  );
}
