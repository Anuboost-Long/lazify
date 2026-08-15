import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { tabLabel } from "../../lib/browser-url";
import { ErrorPageLayout, formatErrorCode } from "./ErrorPageLayout";
import type { BrowserErrorPageProps } from "./types";

export function SiteNotFoundErrorPage({
  error,
  onRetry,
  onOpenInSystemBrowser
}: Readonly<BrowserErrorPageProps>) {
  const { t } = useTranslation();

  return (
    <ErrorPageLayout
      icon="search"
      tone="muted"
      title={t(translation.Browser.ErrorSiteNotFoundTitle)}
      message={t(translation.Browser.ErrorSiteNotFoundMessage, { host: tabLabel(error.url) })}
      advice={t(translation.Browser.ErrorSiteNotFoundAdvice)}
      failedUrl={error.url}
      errorCode={formatErrorCode(error.description, error.code)}
      onRetry={onRetry}
      onOpenInSystemBrowser={onOpenInSystemBrowser}
    />
  );
}
