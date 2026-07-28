import { webContents } from "electron";

export type MediaPipResult = "entered" | "exited" | "unsupported" | "none";

const EXIT_SCRIPT = `(() => {
  if (!document.pictureInPictureElement) return false;
  document.exitPictureInPicture();
  return true;
})()`;

const SEEK_OFFSET_SECONDS = 5;

const SEEK_CONTROLS = `
  function installSeekControls(target) {
    const session = navigator.mediaSession;
    if (!session) return;

    const seekBy = (seconds) => {
      const end = Number.isFinite(target.duration) ? target.duration : Infinity;
      target.currentTime = Math.min(Math.max(target.currentTime + seconds, 0), end);
    };

    const handlers = {
      previoustrack: () => seekBy(-${SEEK_OFFSET_SECONDS}),
      nexttrack: () => seekBy(${SEEK_OFFSET_SECONDS})
    };

    try {
      for (const [action, handler] of Object.entries(handlers)) {
        session.setActionHandler(action, handler);
      }
    } catch {
      return;
    }

    target.addEventListener(
      "leavepictureinpicture",
      () => {
        for (const action of Object.keys(handlers)) {
          try {
            session.setActionHandler(action, null);
          } catch {}
        }
      },
      { once: true }
    );
  }
`;

const ENTER_SCRIPT = `(async () => {
  ${SEEK_CONTROLS}

  try {
    const videos = Array.from(document.querySelectorAll("video"));
    const target =
      videos.find((video) => !video.paused && !video.ended) ??
      videos.find((video) => video.readyState > 0) ??
      videos[0];

    if (!target || target.disablePictureInPicture) return "none";
    if (!document.pictureInPictureEnabled) return "unsupported";

    await target.requestPictureInPicture();

    try {
      installSeekControls(target);
    } catch {}

    return "entered";
  } catch {
    return "unsupported";
  }
})()`;

function framesOf(contents: Electron.WebContents) {
  try {
    return contents.mainFrame.framesInSubtree;
  } catch {
    return [];
  }
}

export async function toggleMediaPictureInPicture(
  webContentsId: number
): Promise<MediaPipResult> {
  const contents = webContents.fromId(webContentsId);
  if (!contents || contents.isDestroyed()) return "none";

  const frames = framesOf(contents);

  for (const frame of frames) {
    try {
      if (await frame.executeJavaScript(EXIT_SCRIPT)) return "exited";
    } catch {}
  }

  let lastFailure: MediaPipResult = "none";

  for (const frame of frames) {
    try {
      const result = await frame.executeJavaScript(ENTER_SCRIPT, true);
      if (result === "entered") return "entered";
      if (result === "unsupported") lastFailure = "unsupported";
    } catch {}
  }

  return lastFailure;
}
