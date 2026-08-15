import { session } from "electron";
import path from "node:path";

import { BROWSER_PARTITION } from "./preview-guard";

/**
 * The browser session's guest-side scripts, owned in one place.
 *
 * Two things want a preload there and `setPreloads` replaces the whole list, so
 * whoever called it last would silently take the other one down — turning the
 * shield off would have taken swipe navigation with it.
 */

const GESTURE_PRELOAD = path.join(__dirname, "../../preload/browser-gesture.js");

let shieldPreload: string | null = null;

function apply(): void {
  const ses = session.fromPartition(BROWSER_PARTITION);
  ses.setPreloads(shieldPreload ? [GESTURE_PRELOAD, shieldPreload] : [GESTURE_PRELOAD]);
}

/** Called at startup, before any guest exists to miss it. */
export function attachBrowserPreloads(): void {
  apply();
}

/** The shield's script comes and goes with the shield; the gesture stays. */
export function setShieldPreload(preloadPath: string | null): void {
  shieldPreload = preloadPath;
  apply();
}
