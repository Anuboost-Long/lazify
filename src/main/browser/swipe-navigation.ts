import { ipcMain, session } from "electron";

import { BROWSER_PARTITION } from "./preview-guard";

/**
 * The main-process half of two-finger swipe navigation. The gesture is detected
 * in the guest — see `src/preload/browser-gesture.ts` — and arrives here as a
 * direction to move that guest's history in, plus the progress the app draws
 * its indicator from.
 */

const SWIPE_CHANNEL = "lazify:browser-swipe";
const PROGRESS_CHANNEL = "lazify:browser-swipe-progress";

export interface SwipeProgressEvent {
  direction: "back" | "forward";
  progress: number;
  velocity: number;
  /** Where the fingers are, so the indicator meets them. */
  y: number;
}

/**
 * @param onProgress Hands the browser page a gesture to draw, or `null` once
 * there is nothing left to draw.
 */
export function registerSwipeNavigation(
  onProgress: (progress: SwipeProgressEvent | null) => void
): void {
  // Only a browser guest may speak for a browser guest: both channels are
  // reachable by anything that can send IPC.
  const fromBrowserGuest = (event: Electron.IpcMainEvent) =>
    event.sender.session === session.fromPartition(BROWSER_PARTITION);

  ipcMain.on(SWIPE_CHANNEL, (event, direction: unknown) => {
    if (!fromBrowserGuest(event)) return;

    const history = event.sender.navigationHistory;

    if (direction === "back") {
      if (history.canGoBack()) history.goBack();
      return;
    }

    if (direction === "forward" && history.canGoForward()) history.goForward();
  });

  ipcMain.on(PROGRESS_CHANNEL, (event, progress: SwipeProgressEvent | null) => {
    if (!fromBrowserGuest(event)) return;
    onProgress(progress ?? null);
  });
}
