import { useEffect, useRef, useState } from "react";

import type { SwipeProgressEvent } from "@main/browser/swipe-navigation";

/** Nothing heard from the gesture for this long means it is over. */
const STALE_MS = 220;

/**
 * The two-finger swipe currently under way, or null.
 *
 * The guest sends an explicit end, and the timer is there for when it cannot:
 * a page that navigates mid-gesture takes its preload with it, and an indicator
 * left frozen over the new page would be worse than no indicator at all.
 */
export function useSwipeProgress(): SwipeProgressEvent | null {
  const [swipe, setSwipe] = useState<SwipeProgressEvent | null>(null);
  const staleTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const stop = globalThis.lazify.onBrowserSwipeProgress((event) => {
      clearTimeout(staleTimer.current);
      setSwipe(event);

      if (event) staleTimer.current = setTimeout(() => setSwipe(null), STALE_MS);
    });

    return () => {
      clearTimeout(staleTimer.current);
      stop();
    };
  }, []);

  return swipe;
}
