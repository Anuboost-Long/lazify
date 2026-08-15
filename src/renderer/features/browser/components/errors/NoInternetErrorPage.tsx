import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { ErrorPageLayout, formatErrorCode } from "./ErrorPageLayout";
import type { BrowserErrorPageProps } from "./types";

export function NoInternetErrorPage({
  error,
  onRetry,
  onOpenInSystemBrowser
}: Readonly<BrowserErrorPageProps>) {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(() => globalThis.navigator?.onLine ?? true);

  // The connection coming back is the moment the load would work.
  useEffect(() => {
    const retryOnceOnline = () => {
      setIsOnline(true);
      onRetry();
    };
    const markOffline = () => setIsOnline(false);

    globalThis.addEventListener("online", retryOnceOnline);
    globalThis.addEventListener("offline", markOffline);

    return () => {
      globalThis.removeEventListener("online", retryOnceOnline);
      globalThis.removeEventListener("offline", markOffline);
    };
  }, [onRetry]);

  return (
    <ErrorPageLayout
      icon="globe"
      tone="muted"
      title={t(translation.Browser.ErrorNoInternetTitle)}
      message={t(translation.Browser.ErrorNoInternetMessage)}
      advice={isOnline ? undefined : t(translation.Browser.ErrorNoInternetWaiting)}
      failedUrl={error.url}
      errorCode={formatErrorCode(error.description, error.code)}
      onRetry={onRetry}
      onOpenInSystemBrowser={onOpenInSystemBrowser}
    />
  );
}
