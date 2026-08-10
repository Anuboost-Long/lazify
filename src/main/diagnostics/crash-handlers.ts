import { app, crashReporter, dialog, shell, type BrowserWindow } from "electron";

import { getLogFilePath, logError, logInfo } from "./logger";

/**
 * Records the ways the app can die, and ends the ones it cannot come back from.
 *
 * The crash reporter collects minidumps **locally** — `uploadToServer` is off,
 * so nothing leaves the machine and there is no endpoint to run. A user who
 * hits a hard crash has a dump to attach to an issue, which is the whole point.
 */

/** Set once the app is on its way out, so nothing prompts twice. */
let shuttingDown = false;

/** How long `will-quit` cleanup gets before the exit is forced. */
const QUIT_GRACE_MS = 3000;

export function installCrashHandlers() {
  crashReporter.start({ uploadToServer: false });

  logInfo(
    "app",
    `Lazify ${app.getVersion()} starting on ${process.platform}/${process.arch}, Electron ${process.versions.electron}`
  );

  app.on("before-quit", () => {
    shuttingDown = true;
  });

  process.on("uncaughtException", (error) => {
    handleFatalError("main", error);
  });

  // Deliberately *not* fatal. An unawaited promise that rejects is usually a
  // failed fetch or a cancelled read, not a corrupted process — killing the
  // app over one would throw away work for something it recovers from on its
  // own. It still gets written down, which is what makes it findable later.
  process.on("unhandledRejection", (reason) => {
    logError("main", "Unhandled rejection", reason);
  });

  // Utility and GPU processes dying is usually why the window went strange.
  // Chromium restarts these on its own, so this is a note, not an ending.
  app.on("child-process-gone", (_event, details) => {
    logError(
      "child-process",
      `${details.type} process gone: ${details.reason} (exit ${details.exitCode})`
    );
  });
}

/**
 * An error the main process cannot continue past.
 *
 * Node's default is to take the process down with nothing written anywhere.
 * Merely catching it is the opposite failure: the app stays on screen with its
 * state already broken, and the user discovers that the slow way. So: write the
 * line, say so plainly, and leave — running `will-quit` cleanup on the way out
 * rather than abandoning the shadow repos and terminals mid-flight.
 */
export function handleFatalError(scope: string, error: unknown) {
  // A second failure while the first is still unwinding must not re-prompt.
  if (shuttingDown) {
    logError(scope, "Further error while shutting down", error);
    return;
  }

  shuttingDown = true;
  logError(scope, "Fatal error, shutting down", error);

  // Before the app is ready there is no window to parent a dialog to and no
  // cleanup worth running. The log is already on disk, so just go.
  if (!app.isReady()) {
    app.exit(1);
    return;
  }

  const choice = dialog.showMessageBoxSync({
    type: "error",
    title: "Lazify has to close",
    message: "Lazify hit an error it can't recover from.",
    detail: `Nothing was sent anywhere. The details were written to:\n${getLogFilePath()}`,
    buttons: ["Quit", "Show log"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });

  if (choice === 1) {
    shell.showItemInFolder(getLogFilePath());
  }

  quitWithGrace();
}

/**
 * Quits so `will-quit` cleanup runs, but never lets a stuck handler leave a
 * broken app on screen — at which point exiting hard is the kinder outcome.
 */
function quitWithGrace() {
  app.quit();
  setTimeout(() => app.exit(1), QUIT_GRACE_MS);
}

/** The renderer's own failures, which the main process never sees otherwise. */
export function watchWindowCrashes(window: BrowserWindow) {
  window.webContents.on("render-process-gone", (_event, details) => {
    logError(
      "renderer",
      `Render process gone: ${details.reason} (exit ${details.exitCode})`
    );

    // "clean-exit" is what a normal quit looks like from here, and a crash
    // during shutdown is already being handled.
    if (shuttingDown || details.reason === "clean-exit") {
      return;
    }

    // Unlike a dead main process, this one is genuinely recoverable — the
    // window reloads into a fresh renderer. Offer that before quitting, or the
    // user is left staring at a blank frame with no way forward.
    const choice = dialog.showMessageBoxSync(window, {
      type: "error",
      title: "Lazify stopped responding",
      message: "The Lazify window crashed.",
      detail: `Reloading usually recovers it. Details were written to:\n${getLogFilePath()}`,
      buttons: ["Reload", "Quit"],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });

    if (choice === 0) {
      logInfo("renderer", "Reloading after a crash");
      window.reload();
      return;
    }

    shuttingDown = true;
    quitWithGrace();
  });

  window.webContents.on("unresponsive", () => {
    logError("renderer", "Window stopped responding");
  });

  window.webContents.on("responsive", () => {
    logInfo("renderer", "Window responsive again");
  });
}

/** Test seam: the module-level shutdown latch is deliberately sticky. */
export function resetShutdownStateForTests() {
  shuttingDown = false;
}
