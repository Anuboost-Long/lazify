import { app, crashReporter, type BrowserWindow } from "electron";

import { logError, logInfo } from "./logger";

/**
 * Records the ways the app can die.
 *
 * The crash reporter collects minidumps **locally** — `uploadToServer` is off,
 * so nothing leaves the machine and there is no endpoint to run. A user who
 * hits a hard crash has a dump to attach to an issue, which is the whole point.
 */
export function installCrashHandlers() {
  crashReporter.start({ uploadToServer: false });

  logInfo(
    "app",
    `Lazify ${app.getVersion()} starting on ${process.platform}/${process.arch}, Electron ${process.versions.electron}`
  );

  // Node would otherwise take the whole app down with nothing written
  // anywhere. Logging synchronously and staying up is the trade every desktop
  // app makes here: a window the user can still close beats a silent
  // disappearance, and the line is on disk either way.
  process.on("uncaughtException", (error) => {
    logError("main", "Uncaught exception", error);
  });

  process.on("unhandledRejection", (reason) => {
    logError("main", "Unhandled rejection", reason);
  });

  // Utility and GPU processes dying is usually why the window went strange.
  app.on("child-process-gone", (_event, details) => {
    logError(
      "child-process",
      `${details.type} process gone: ${details.reason} (exit ${details.exitCode})`
    );
  });
}

/** The renderer's own failures, which the main process never sees otherwise. */
export function watchWindowCrashes(window: BrowserWindow) {
  window.webContents.on("render-process-gone", (_event, details) => {
    logError(
      "renderer",
      `Render process gone: ${details.reason} (exit ${details.exitCode})`
    );
  });

  window.webContents.on("unresponsive", () => {
    logError("renderer", "Window stopped responding");
  });

  window.webContents.on("responsive", () => {
    logInfo("renderer", "Window responsive again");
  });
}
