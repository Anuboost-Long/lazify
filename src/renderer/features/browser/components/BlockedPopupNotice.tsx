import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/** Mirrors BlockedPopup in main; kept here so the renderer owns its own shape. */
export interface BlockedPopup {
  url: string;
  sourceUrl: string;
  kind: "popup" | "redirect";
}

interface BlockedPopupNoticeProps {
  blocked: BlockedPopup;
  /** Opens it after all, in a tab, because the user says they meant it. */
  onOpen: (url: string) => void;
  /** Trusts the page that asked, so it need not ask again. */
  onAllowSite: (sourceUrl: string) => void;
  onDismiss: () => void;
}

/** Host and path, enough to tell an ad network from a sign-in page. */
function shortAddress(raw: string): string {
  try {
    const url = new URL(raw);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.hostname}${path}`;
  } catch {
    return raw;
  }
}

/**
 * The strip that appears under the toolbar when something was held back.
 *
 * It exists so the policy can be strict without being lossy: a popunder is
 * stopped and the user reads one line they can ignore, while the sign-in window
 * a site legitimately needed is a click from opening.
 */
export function BlockedPopupNotice({
  blocked,
  onOpen,
  onAllowSite,
  onDismiss
}: Readonly<BlockedPopupNoticeProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
      <UiIcon name="shield" className="h-3.5 w-3.5 shrink-0 text-accent" />

      <SmallText className="!text-text shrink-0">
        {t(
          blocked.kind === "redirect"
            ? translation.Browser.RedirectBlocked
            : translation.Browser.PopupBlocked
        )}
      </SmallText>

      <SmallText className="!text-muted min-w-0 flex-1 truncate font-mono">
        {shortAddress(blocked.url)}
      </SmallText>

      <button
        type="button"
        onClick={() => onOpen(blocked.url)}
        className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-accent hover:bg-accent/10"
      >
        {t(translation.Browser.PopupBlockedOpen)}
      </button>
      <button
        type="button"
        onClick={() => onAllowSite(blocked.sourceUrl)}
        className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-text hover:bg-text/[0.06]"
      >
        {t(translation.Browser.PopupBlockedAllowSite)}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t(translation.GlobalTerm.Close)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-text/[0.06]"
      >
        <UiIcon name="xmark" className="h-3 w-3" />
      </button>
    </div>
  );
}
