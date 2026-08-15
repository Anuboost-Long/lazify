import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { tabLabel } from "../../lib/browser-url";
import { ErrorPageLayout, formatErrorCode } from "./ErrorPageLayout";
import type { BrowserErrorPageProps } from "./types";

export function SiteUnreachableErrorPage({
  error,
  onRetry,
  onOpenInSystemBrowser
}: Readonly<BrowserErrorPageProps>) {
  const { t } = useTranslation();

  return (
    <ErrorPageLayout
      icon="warning-triangle"
      title={t(translation.Browser.ErrorSiteUnreachableTitle)}
      message={t(translation.Browser.ErrorSiteUnreachableMessage, { host: tabLabel(error.url) })}
      advice={t(translation.Browser.ErrorSiteUnreachableAdvice)}
      failedUrl={error.url}
      errorCode={formatErrorCode(error.description, error.code)}
      onRetry={onRetry}
      onOpenInSystemBrowser={onOpenInSystemBrowser}
    />
  );
}
