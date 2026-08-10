import { app } from "electron";
// Named, never a default import: electron-updater marks itself `__esModule`
// but exports no `default`, so the interop helper hands back undefined. This
// also keeps `autoUpdater` behind its lazy getter, which builds the platform
// updater on first use rather than when this module is imported.
import { autoUpdater } from "electron-updater";

import type { UpdateState } from "../renderer/shared/types/lazify";

/**
 * In-app updates, served by the public releases repo.
 *
 * The flow is deliberately not automatic. `autoDownload` is off, so a check
 * only ever reports what is available and the user decides whether to spend
 * the bandwidth — an agent mid-run is a bad moment to start pulling 100 MB.
 * Installing is a second, separate decision, because it restarts the app.
 *
 * Two things to know when this looks like it is doing nothing:
 *
 *   - It is inert in development. There is no packaged app to replace, so
 *     `checkForUpdates` refuses and every check reports "unsupported".
 *   - On macOS the downloaded update is applied by Squirrel.Mac, which
 *     validates the code signature first. Until the app is signed with a
 *     Developer ID certificate, a mac download will fail at install time.
 *     Windows has no equivalent gate and works unsigned today.
 */

let state: UpdateState = { status: "idle" };
let publish: ((next: UpdateState) => void) | null = null;

function setState(next: UpdateState) {
  state = next;
  publish?.(next);
}

export function getUpdateState(): UpdateState {
  return state;
}

/**
 * Wires the updater's events to a publisher that forwards them to the window.
 * Called once at startup; the renderer reads `getUpdateState` on mount to
 * catch up on anything that happened before it was listening.
 */
export function initUpdater(onChange: (next: UpdateState) => void) {
  publish = onChange;

  // Progress and decisions are the app's to show, so the built-in logging and
  // auto-download stay out of the way.
  autoUpdater.autoDownload = false;
  // The install still waits for `quitAndInstall`; this only covers the case
  // where the user quits on their own after downloading one.
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => setState({ status: "checking" }));

  autoUpdater.on("update-available", (info) =>
    setState({
      status: "available",
      version: info.version,
      releaseDate: info.releaseDate ?? null,
      releaseNotes: typeof info.releaseNotes === "string" ? info.releaseNotes : null,
    })
  );

  autoUpdater.on("update-not-available", () =>
    setState({ status: "current", version: app.getVersion() })
  );

  autoUpdater.on("download-progress", (progress) =>
    setState({
      status: "downloading",
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  );

  autoUpdater.on("update-downloaded", (info) =>
    setState({ status: "downloaded", version: info.version })
  );

  autoUpdater.on("error", (error) =>
    setState({ status: "error", message: error.message })
  );
}

/** Asks the release feed what is out there. Never throws — the state says. */
export async function checkForUpdates(): Promise<UpdateState> {
  if (!app.isPackaged) {
    setState({ status: "unsupported" });
    return state;
  }

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setState({
      status: "error",
      message: error instanceof Error ? error.message : "Update check failed.",
    });
  }

  return state;
}

/** Pulls the update the last check found. Progress arrives as state changes. */
export async function downloadUpdate(): Promise<UpdateState> {
  if (!app.isPackaged) {
    setState({ status: "unsupported" });
    return state;
  }

  try {
    setState({ status: "downloading", percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 });
    await autoUpdater.downloadUpdate();
  } catch (error) {
    setState({
      status: "error",
      message: error instanceof Error ? error.message : "Update download failed.",
    });
  }

  return state;
}

/**
 * Swaps in the downloaded update and relaunches. Everything the app is running
 * — agent terminals, scripts, the shadow repos — goes down with it, so this is
 * only ever called from a deliberate click.
 */
export function quitAndInstall() {
  if (state.status !== "downloaded") {
    return;
  }

  autoUpdater.quitAndInstall();
}
