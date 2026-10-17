import type { BrowserViewFrameResult } from "@chain/sdk";

export type MediaPipResult = "entered" | "exited" | "unsupported" | "none";

// Electron's two scripts, unchanged (`src/main/media/media-pip.ts`).
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

/** The checks the enter script makes before it asks for picture in picture, without asking. */
const PROBE_SCRIPT = `(() => {
  const videos = Array.from(document.querySelectorAll("video"));
  const target =
    videos.find((video) => !video.paused && !video.ended) ??
    videos.find((video) => video.readyState > 0) ??
    videos[0];

  if (!target || target.disablePictureInPicture) return "none";
  return document.pictureInPictureEnabled ? "candidate" : "unsupported";
})()`;

/** Runs a script body in the page and every nested frame, main frame first, each as if just clicked. */
export type RunInFrames = (body: string) => Promise<BrowserViewFrameResult[]>;

const onlyIn = (url: string, script: string) =>
  `if (location.href !== ${JSON.stringify(url)}) return "skip"; return await ${script};`;

/**
 * Electron's walk, frame by frame: leave picture in picture if any frame is
 * in it, otherwise enter it from the first frame whose video can. Every
 * frame is asked first and then only the chosen one acts, since a script run
 * everywhere at once would have every frame with a video ask for it.
 */
export async function toggleMediaPictureInPicture(run: RunInFrames): Promise<MediaPipResult> {
  const exits = await run(`return ${EXIT_SCRIPT};`);
  if (exits.some((result) => result.value === true)) return "exited";

  const probes = await run(`return ${PROBE_SCRIPT};`);
  let lastFailure: MediaPipResult = probes.some((result) => result.value === "unsupported") ? "unsupported" : "none";

  for (const { frame } of probes.filter((result) => result.value === "candidate")) {
    const results = await run(onlyIn(frame.url, ENTER_SCRIPT));
    const outcome = results.find((result) => result.frame.url === frame.url && result.value !== "skip")?.value;
    if (outcome === "entered") return "entered";
    if (outcome === "unsupported") lastFailure = "unsupported";
  }

  return lastFailure;
}
