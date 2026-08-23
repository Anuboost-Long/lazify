import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdateState } from "../../src/renderer/shared/types/lazify";

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, (payload: unknown) => void>();

  return {
    listeners,
    app: { isPackaged: false, getVersion: () => "1.0.0" },
    autoUpdater: {
      autoDownload: true,
      autoInstallOnAppQuit: false,
      on: (event: string, callback: (payload: unknown) => void) => {
        listeners.set(event, callback);
      },
      checkForUpdates: vi.fn(async () => undefined),
      downloadUpdate: vi.fn(async () => undefined),
      quitAndInstall: vi.fn()
    }
  };
});

vi.mock("electron", () => ({ app: mocks.app }));
// Shaped the way electron-updater really is — a named export and no default.
// Mocking a default here would hide the interop the real module needs.
vi.mock("electron-updater", () => ({ autoUpdater: mocks.autoUpdater }));

/** A fresh module per test — the updater keeps its state at module scope. */
async function loadUpdater(packaged: boolean) {
  vi.resetModules();
  mocks.listeners.clear();
  mocks.autoUpdater.checkForUpdates.mockClear();
  mocks.autoUpdater.downloadUpdate.mockClear();
  mocks.autoUpdater.quitAndInstall.mockClear();
  mocks.app.isPackaged = packaged;

  const updater = await import("../../src/main/updater");
  const published: UpdateState[] = [];
  updater.initUpdater((state) => published.push(state));

  return { ...updater, published };
}

/** Fires an event the way electron-updater would. */
function emit(event: string, payload?: unknown) {
  const listener = mocks.listeners.get(event);
  if (!listener) throw new Error(`nothing listening for "${event}"`);
  listener(payload);
}

const hostPlatform = process.platform;

function runningOn(platform: string) {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
}

beforeEach(() => {
  mocks.autoUpdater.autoDownload = true;
  mocks.autoUpdater.autoInstallOnAppQuit = false;
  runningOn("darwin");
  delete process.env.APPIMAGE;
});

afterEach(() => {
  runningOn(hostPlatform);
  delete process.env.APPIMAGE;
});

describe("updater", () => {
  it("leaves downloading to the user rather than starting on its own", async () => {
    await loadUpdater(true);

    expect(mocks.autoUpdater.autoDownload).toBe(false);
  });

  it("does nothing in development, where there is no app to replace", async () => {
    const updater = await loadUpdater(false);

    const unsupported = { status: "unsupported", reason: "development" };
    expect(await updater.checkForUpdates()).toEqual(unsupported);
    expect(await updater.downloadUpdate()).toEqual(unsupported);
    expect(mocks.autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    expect(mocks.autoUpdater.downloadUpdate).not.toHaveBeenCalled();
  });

  /**
   * A Linux .deb belongs to apt, and electron-updater can only replace an
   * AppImage. Left to throw, that arrives as a raw error where the true answer
   * is that this build updates somewhere else.
   */
  it("defers to the package manager for a Linux build that is not an AppImage", async () => {
    runningOn("linux");

    const updater = await loadUpdater(true);

    expect(await updater.checkForUpdates()).toEqual({
      status: "unsupported",
      reason: "package-manager"
    });
    expect(mocks.autoUpdater.checkForUpdates).not.toHaveBeenCalled();

    // An AppImage on the same platform is the case the updater can handle.
    process.env.APPIMAGE = "/tmp/Lazify-x64.AppImage";
    const appImage = await loadUpdater(true);
    await appImage.checkForUpdates();
    expect(mocks.autoUpdater.checkForUpdates).toHaveBeenCalled();
  });

  it("reports what the updater finds, all the way to ready-to-install", async () => {
    const updater = await loadUpdater(true);

    emit("update-available", { version: "1.1.0", releaseDate: "2026-08-09", releaseNotes: "Fixes" });
    expect(updater.getUpdateState()).toEqual({
      status: "available",
      version: "1.1.0",
      releaseDate: "2026-08-09",
      releaseNotes: "Fixes"
    });

    emit("download-progress", {
      percent: 42.5,
      bytesPerSecond: 1024,
      transferred: 425,
      total: 1000
    });
    expect(updater.getUpdateState()).toMatchObject({ status: "downloading", percent: 42.5 });

    emit("update-downloaded", { version: "1.1.0" });
    expect(updater.getUpdateState()).toEqual({ status: "downloaded", version: "1.1.0" });

    // Every one of those reached the window, not just the last.
    expect(updater.published.map((state) => state.status)).toEqual([
      "available",
      "downloading",
      "downloaded"
    ]);
  });

  it("names the running version when there is nothing newer", async () => {
    const updater = await loadUpdater(true);

    emit("update-not-available");

    expect(updater.getUpdateState()).toEqual({ status: "current", version: "1.0.0" });
  });

  it("will not restart into an update that has not been downloaded", async () => {
    const updater = await loadUpdater(true);

    emit("update-available", { version: "1.1.0", releaseDate: null, releaseNotes: null });
    updater.quitAndInstall();
    expect(mocks.autoUpdater.quitAndInstall).not.toHaveBeenCalled();

    emit("update-downloaded", { version: "1.1.0" });
    updater.quitAndInstall();
    expect(mocks.autoUpdater.quitAndInstall).toHaveBeenCalledOnce();
  });

  it("reports a failed check instead of throwing at the caller", async () => {
    const updater = await loadUpdater(true);
    mocks.autoUpdater.checkForUpdates.mockRejectedValueOnce(new Error("net::ERR_FAILED"));

    const state = await updater.checkForUpdates();

    expect(state).toEqual({ status: "error", message: "net::ERR_FAILED" });
  });
});
