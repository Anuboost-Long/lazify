import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { tabLabel } from "../../lib/browser-url";
import { ErrorPageLayout, formatErrorCode } from "./ErrorPageLayout";
import type { BrowserErrorPageProps } from "./types";

// No "continue anyway": this surface has no certificate exception flow, and a
// button that pretended otherwise would teach the habit past the warning.
export function InsecureCertificateErrorPage({
  error,
  onRetry,
  onOpenInSystemBrowser
}: Readonly<BrowserErrorPageProps>) {
  const { t } = useTranslation();

  return (
    <ErrorPageLayout
      icon="shield-off"
      title={t(translation.Browser.ErrorInsecureCertificateTitle)}
      message={t(translation.Browser.ErrorInsecureCertificateMessage, {
        host: tabLabel(error.url)
      })}
      advice={t(translation.Browser.ErrorInsecureCertificateAdvice)}
      failedUrl={error.url}
      errorCode={formatErrorCode(error.description, error.code)}
      onRetry={onRetry}
      onOpenInSystemBrowser={onOpenInSystemBrowser}
    />
  );
}
