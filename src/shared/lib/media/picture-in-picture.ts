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
