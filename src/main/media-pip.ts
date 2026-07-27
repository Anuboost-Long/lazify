import { webContents } from "electron";

/**
 * Chromium's own picture-in-picture: the page's video in the OS mini player.
 *
 * This lives in main rather than the renderer because the video is often not in
 * the frame the renderer can reach. `webview.executeJavaScript` only ever runs
 * in the guest's top document, so an embedded player — a YouTube iframe, a
 * course video, anything in a cross-origin frame — is invisible to it and the
 * button did nothing. From here every frame of the guest can be asked in turn.
 *
 * The floating player it produces is the OS one: it outlives switching tabs
 * inside Lazify, and outlives Lazify losing focus, which is the whole reason to
 * prefer it for video over a second window.
 */

export type MediaPipResult = "entered" | "exited" | "unsupported" | "none";

/**
 * Leaves the player, wherever it is. Exiting needs no user gesture, so this can
 * sweep every frame before anything is asked to enter.
 */
const EXIT_SCRIPT = `(() => {
  if (!document.pictureInPictureElement) return false;
  document.exitPictureInPicture();
  return true;
})()`;

/**
 * Sends this frame's most relevant video to the player.
 *
 * Preference order is what the viewer would point at: the video that is
 * playing, then one that has loaded something, then whatever is first.
 *
 * "none" means this frame had nothing worth floating and the sweep should carry
 * on to the next one; the other answers are final. `pictureInPictureEnabled` is
 * only consulted once a video is found, so a frame that simply has no video
 * does not end the sweep by reporting the feature missing.
 */
const ENTER_SCRIPT = `(async () => {
  try {
    const videos = Array.from(document.querySelectorAll("video"));
    const target =
      videos.find((video) => !video.paused && !video.ended) ??
      videos.find((video) => video.readyState > 0) ??
      videos[0];

    if (!target || target.disablePictureInPicture) return "none";
    if (!document.pictureInPictureEnabled) return "unsupported";

    await target.requestPictureInPicture();
    return "entered";
  } catch {
    // A page that refused, or one whose permissions policy blocks the frame.
    return "unsupported";
  }
})()`;

/** Every frame of the guest. The subtree includes the main frame, and leads with it. */
function framesOf(contents: Electron.WebContents) {
  try {
    return contents.mainFrame.framesInSubtree;
  } catch {
    // Torn down between the id lookup and here.
    return [];
  }
}

/**
 * Toggles the guest's video in or out of the OS player.
 *
 * @param webContentsId The guest's id, taken from the `<webview>` in the
 * renderer — the toolbar drives the tab the user is looking at, not the app
 * window it is drawn in.
 */
export async function toggleMediaPictureInPicture(
  webContentsId: number
): Promise<MediaPipResult> {
  const contents = webContents.fromId(webContentsId);
  if (!contents || contents.isDestroyed()) return "none";

  const frames = framesOf(contents);

  // Exit sweeps first and on its own: the player may belong to a frame other
  // than the one holding the video we would otherwise pick, and a toggle that
  // is already on must turn off rather than move.
  for (const frame of frames) {
    try {
      if (await frame.executeJavaScript(EXIT_SCRIPT)) return "exited";
    } catch {
      // A frame that navigated away mid-sweep; the rest still count.
    }
  }

  let lastFailure: MediaPipResult = "none";

  for (const frame of frames) {
    try {
      // The gesture flag is not optional here: without it Chromium rejects the
      // request outright, whatever the page does.
      const result = await frame.executeJavaScript(ENTER_SCRIPT, true);
      if (result === "entered") return "entered";
      if (result === "unsupported") lastFailure = "unsupported";
    } catch {
      // As above — keep asking the frames that are still there.
    }
  }

  return lastFailure;
}
