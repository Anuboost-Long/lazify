import { BrowserWindow } from "electron";

import {
  BROWSER_PARTITION,
  PREVIEW_PARTITION,
  isLoopbackUrl,
  openExternalUrl
} from "./preview-guard";

/**
 * A page kept on screen while the user works somewhere else.
 *
 * The media half of picture-in-picture is Chromium's own — a `<video>` asks for
 * it from inside the guest, and the OS draws the floating player. This is the
 * other half: the whole page in a small always-on-top window, for everything
 * that is not a video. A dev server's output next to the editor that is
 * changing it, without either one giving up its space.
 *
 * One window at a time. A second request re-points the window that exists
 * rather than stacking another floater over the desktop.
 *
 * The window is not a second app window: it carries the partition of the
 * surface it came from, so the preview's isolation from the browser page holds
 * here too, and a preview floater may still only load loopback.
 */

export type PictureInPictureSource = "preview" | "browser";

export interface PictureInPictureState {
  open: boolean;
  /** The URL the floating window is showing, or null when there is none. */
  url: string | null;
  /**
   * Which surface it is showing. There is one window and a button on more than
   * one surface, so a button can only claim to be on when it is the owner.
   */
  source: PictureInPictureSource | null;
}

const CLOSED: PictureInPictureState = { open: false, url: null, source: null };

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 320;

let pipWindow: BrowserWindow | null = null;
let currentSource: PictureInPictureSource | null = null;
/** Called whenever the window opens, moves surface, or goes away. */
let onChanged: ((state: PictureInPictureState) => void) | null = null;

/** Lets main keep every toolbar button in step with the one window. */
export function onPictureInPictureChanged(
  callback: (state: PictureInPictureState) => void
): void {
  onChanged = callback;
}

function currentState(): PictureInPictureState {
  if (!pipWindow || pipWindow.isDestroyed()) return CLOSED;

  return {
    open: true,
    url: pipWindow.webContents.getURL() || null,
    source: currentSource
  };
}

export function getPictureInPictureState(): PictureInPictureState {
  return currentState();
}

export function closePictureInPicture(): PictureInPictureState {
  // The window's own "closed" handler is what announces this, so closing from
  // the app and closing from the title bar are the same event downstream.
  if (pipWindow && !pipWindow.isDestroyed()) pipWindow.close();
  pipWindow = null;
  currentSource = null;

  return CLOSED;
}

/**
 * Opens — or re-points — the floating window.
 *
 * @param source Which surface asked, which decides both the session the window
 * joins and whether it may leave loopback.
 */
export function openPictureInPicture(
  url: string,
  source: PictureInPictureSource
): PictureInPictureState {
  // The preview is loopback-only wherever it is drawn. A floating window is
  // still the preview, so it inherits the rule rather than escaping it.
  if (source === "preview" && !isLoopbackUrl(url)) {
    return currentState();
  }

  // Re-pointed rather than stacked — including at another surface's request,
  // which is why the owner is recorded and announced.
  if (pipWindow && !pipWindow.isDestroyed()) {
    currentSource = source;
    void pipWindow.loadURL(url);
    pipWindow.show();

    const state = currentState();
    onChanged?.(state);

    return state;
  }

  const window = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: 240,
    minHeight: 160,
    // A floater is not a place to work: no maximise, no fullscreen, and out of
    // the way of the window switcher.
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    backgroundColor: "#000000",
    title: "Lazify",
    webPreferences: {
      partition: source === "browser" ? BROWSER_PARTITION : PREVIEW_PARTITION,
      preload: undefined,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // The whole point is that it keeps running while it is not focused.
      backgroundThrottling: false
    }
  });

  // "floating" outranks ordinary always-on-top windows, and staying visible on
  // every workspace is what makes it usable next to a fullscreen editor.
  window.setAlwaysOnTop(true, "floating");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // A popup from inside the floater has nowhere sensible to go — the real
  // browser takes it, the same way the preview panel hands links off.
  window.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
    openExternalUrl(popupUrl);
    return { action: "deny" };
  });

  // Same rule as the panel: a preview floater that is navigated off the machine
  // sends the link to the real browser instead of following it.
  if (source === "preview") {
    window.webContents.on("will-navigate", (event, nextUrl) => {
      if (isLoopbackUrl(nextUrl)) return;
      event.preventDefault();
      openExternalUrl(nextUrl);
    });
  }

  window.on("closed", () => {
    pipWindow = null;
    currentSource = null;
    onChanged?.(CLOSED);
  });

  pipWindow = window;
  currentSource = source;
  void window.loadURL(url);

  const state = currentState();
  onChanged?.(state);

  return state;
}
