/**
 * Chromium's own picture-in-picture, asked for on behalf of a `<webview>`.
 *
 * The request itself is made in main, frame by frame — see `main/media-pip`.
 * Running it from here would only ever see the guest's top document, which
 * misses every embedded player. The floating player it produces is the OS one:
 * it outlives switching tabs inside Lazify, and outlives Lazify losing focus,
 * which is the whole reason to prefer it for video over a second window.
 */

export type MediaPipResult = import("../../../main/media-pip").MediaPipResult;

/** Toggles the guest's most relevant video in or out of the OS player. */
export async function toggleMediaPictureInPicture(
  view: LazifyWebviewElement
): Promise<MediaPipResult> {
  try {
    return await globalThis.lazify.toggleMediaPictureInPicture(view.getWebContentsId());
  } catch {
    // A detached guest, or a page that tore itself down mid-call.
    return "none";
  }
}
