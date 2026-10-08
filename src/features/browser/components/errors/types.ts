import type { BrowserError } from "../../lib/browser-error";

/** One shape for every error page, so the tab can pick one by kind. */
export interface BrowserErrorPageProps {
  error: BrowserError;
  onRetry: () => void;
  onOpenInSystemBrowser: () => void;
}
