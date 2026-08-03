import { useCallback, useEffect, useState } from "react";

import type { BlockedPopup } from "../components/BlockedPopupNotice";

/**
 * The popup main most recently held back, if the user has not answered it yet.
 *
 * Only the last one is kept. A page that pops one advert usually pops several,
 * and a queue of them would be a worse annoyance than the popups were — the
 * user wants either the thing they clicked or nothing.
 */
export function useBlockedPopups() {
  const [blocked, setBlocked] = useState<BlockedPopup | null>(null);

  useEffect(() => {
    return globalThis.lazify.onBrowserPopupBlocked((event) => {
      setBlocked(event);
    });
  }, []);

  const dismiss = useCallback(() => setBlocked(null), []);

  /** Trusts the page that asked, so its popups open directly from now on. */
  const allowSite = useCallback((sourceUrl: string) => {
    void globalThis.lazify.allowPopupsFrom(sourceUrl);
    setBlocked(null);
  }, []);

  return { blocked, dismiss, allowSite };
}
