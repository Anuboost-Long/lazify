import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { tabLabel } from "../../lib/browser-url";
import { ErrorPageLayout, formatErrorCode } from "./ErrorPageLayout";
import type { BrowserErrorPageProps } from "./types";

/** ERR_BLOCKED_BY_CLIENT — here the client is Lazy Shield, which is switchable. */
const ERR_BLOCKED_BY_CLIENT = -20;

export function BlockedErrorPage({
  error,
  onRetry,
  onOpenInSystemBrowser
}: Readonly<BrowserErrorPageProps>) {
  const { t } = useTranslation();
  const blockedByShield = error.code === ERR_BLOCKED_BY_CLIENT;

  return (
    <ErrorPageLayout
      icon="shield"
      tone="accent"
      title={t(translation.Browser.ErrorBlockedTitle)}
      message={t(translation.Browser.ErrorBlockedMessage, { host: tabLabel(error.url) })}
      advice={t(
        blockedByShield
          ? translation.Browser.ErrorBlockedByShieldAdvice
          : translation.Browser.ErrorBlockedByPolicyAdvice
      )}
      failedUrl={error.url}
      errorCode={formatErrorCode(error.description, error.code)}
      onRetry={onRetry}
      onOpenInSystemBrowser={onOpenInSystemBrowser}
    />
  );
}
