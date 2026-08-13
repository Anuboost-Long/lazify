import { app, BrowserWindow, ipcMain, Notification } from "electron";
import fs from "node:fs";
import path from "node:path";

import { CommandRunner } from "./command-runner";
import { logWarn } from "./diagnostics/logger";
import { APP_ICON_PATH } from "./icon-path";
import { PtyRunner } from "./pty-runner";
import { refreshCatalog } from "./scaffolding/catalog";
import { cleanupShadowRepos } from "./agents/agent-changes";
import { WorkflowEngine } from "./scaffolding/workflow-engine";
import { AttentionDetector } from "./agents/attention-detector";
import { Autopilot, type AutopilotAnswered } from "./agents/autopilot";
import type { AutopilotHold } from "./agents/autopilot-policy";
import { isAutopilotActive } from "./agents/autopilot-store";
import { watchAgentActivity } from "./agents/agent-activity-watcher";
import { closePictureInPicture, onPictureInPictureChanged } from "./media/picture-in-picture";
import { guardPreviewWebviews } from "./browser/preview-guard";
import { installBrowserPermissionPolicy } from "./browser/browser-permissions";
import { closeSplash, showSplash } from "./splash";
import { initLazyShield, shouldBlockPopup } from "./browser/lazy-shield";
import { normalizeRuntimePath } from "./environment/runtime-path";
import { installCrashHandlers, watchWindowCrashes } from "./diagnostics/crash-handlers";
import { registerDomainHandlers } from "./ipc";
import { initUpdater } from "./updater";

// Windows ties toast notifications to an AppUserModelID. Without one set here,
// `new Notification()` reports success but never actually shows a toast —
// especially in dev, where the process has no Start Menu shortcut to inherit
// one from. Must match `appId` in electron-builder.win.yml.
if (process.platform === "win32") {
  app.setAppUserModelId("com.lazify.desktop");
}

let mainWindow: BrowserWindow | null = null;
let stopAgentActivityWatch: (() => void) | null = null;

const emitToRenderer = (channel: string, payload: unknown) => {
  mainWindow?.webContents.send(channel, payload);
};

const commandRunner = new CommandRunner(
  (event) => emitToRenderer("lazify:log", event),
  (prompt) => emitToRenderer("lazify:command-choice-prompt", prompt),
);
const workflowEngine = new WorkflowEngine(commandRunner, (event) =>
  emitToRenderer("lazify:workflow-progress", event)
);
const attentionDetector = new AttentionDetector((runId) => emitTurnDone(runId));

/**
 * Reports a run that has started (or stopped) waiting on the user. Two distinct
 * alerts, on two distinct conditions:
 *
 *  - The in-app indicators (the project-card bell, the tab marker) follow the
 *    waiting state itself and are ALWAYS sent, focus or not — while the agent
 *    waits for an answer, its project shows the bell.
 *  - The OS notification and dock bounce are the ONLY thing that reaches the
 *    user when Lazify is not focused, so they fire solely in that case. With
 *    the window focused the bell is already on screen, so a banner would be
 *    redundant noise.
 *
 * `hold` carries the reason autopilot left this one alone, when it looked at it.
 * The alert is the same either way — the user is still needed — but "this is a
 * force-push" and "this is asking which approach you want" are worth telling
 * apart before walking over to the terminal.
 */
const emitAttention = (runId: string, waiting: boolean, hold: AutopilotHold | null = null) => {
  const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
  if (!session) return;

  // In-app: the project-card bell / tab marker. Never gated on focus.
  emitToRenderer("lazify:agent-attention", {
    runId,
    projectPath: session.projectPath,
    projectName: session.projectName,
    agentLabel: session.scriptName,
    waiting,
    hold
  });

  // OS-level: only when the agent is waiting AND the user is looking elsewhere.
  if (!waiting || mainWindow?.isFocused()) return;

  if (Notification.isSupported()) {
    new Notification({
      title: `${session.scriptName} needs you`,
      body: `${session.projectName} is waiting for a response.`,
      // Linux notifications carry no application identity of their own — with
      // no icon the banner arrives blank, from nothing the user can recognise.
      icon: APP_ICON_PATH
    }).show();
  }

  // Bounces the dock icon until the user comes back to the app.
  app.dock?.bounce("informational");
};

/** Brings the window forward and points the renderer at a specific run. */
const focusRun = (payload: { runId: string; projectPath: string }) => {
  if (mainWindow?.isMinimized()) mainWindow.restore();
  mainWindow?.show();
  mainWindow?.focus();

  emitToRenderer("lazify:agent-focus", payload);
};

/**
 * Reports a run that has finished what the user asked of it — the counterpart
 * to the waiting alert above, and the same split: the in-app toast is always
 * sent, while the OS banner only fires when the window is not focused. Its
 * click handler is the point of the banner: it lands the user on the terminal
 * that finished rather than merely raising the app.
 */
const emitTurnDone = (runId: string) => {
  const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
  if (!session) return;

  const payload = {
    runId,
    projectPath: session.projectPath,
    projectName: session.projectName,
    agentLabel: session.scriptName
  };

  emitToRenderer("lazify:agent-done", payload);

  if (mainWindow?.isFocused()) return;

  if (Notification.isSupported()) {
    const notification = new Notification({
      title: `${session.scriptName} is done`,
      body: `${session.projectName} finished the task you gave it.`,
      icon: APP_ICON_PATH
    });

    notification.on("click", () => focusRun(payload));
    notification.show();
  }

  app.dock?.bounce("informational");
};

const ptyRunner = new PtyRunner(
  (event) => {
    emitToRenderer("lazify:pty-data", event);

    const waiting = attentionDetector.push(event.runId, event.data);
    if (waiting === null) return;

    // A prompt autopilot has taken on does not ring the bell yet: it is usually
    // answered inside the settle window, and an alert for something the user
    // never had to act on is the noise this feature exists to remove. Declining
    // comes back through `onHeld`, which raises the ordinary alert from there —
    // so every prompt still reaches the user by one path or the other.
    if (waiting && autopilot.willConsider(event.runId)) {
      autopilot.consider(event.runId);
      return;
    }

    emitAttention(event.runId, waiting);
  },
  (event) => {
    emitToRenderer("lazify:script-status", event);

    // The session is already gone from the runner by the time this fires, so
    // there is nothing to look up — the renderer clears its own badge off the
    // same status event.
    // A script that exits non-zero is the thing a support request is about, and
    // the terminal pane holding the reason is gone as soon as the tab is.
    if (typeof event.exitCode === "number" && event.exitCode !== 0) {
      logWarn("scripts", `"${event.scriptName}" exited with ${event.exitCode}`, {
        runId: event.runId
      });
    }

    if (event.status === "done" || event.status === "error") {
      attentionDetector.forget(event.runId);
      autopilot.forget(event.runId);
    }
  }
);

/**
 * Reports a prompt autopilot answered by itself.
 *
 * Deliberately loud in the feed and silent everywhere else: no notification, no
 * dock bounce. The point of answering was that the user did not have to be
 * interrupted, so telling them about it with a banner would undo the feature.
 * The record is there for when they want to know what was said in their name.
 */
const emitAutopilotAnswer = (runId: string, detail: AutopilotAnswered) => {
  const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
  if (!session) return;

  emitToRenderer("lazify:autopilot-answered", {
    runId,
    projectPath: session.projectPath,
    projectName: session.projectName,
    agentLabel: session.scriptName,
    question: detail.question,
    optionLabel: detail.optionLabel
  });
};

/**
 * Autopilot: the prompts the user would have said yes to anyway, answered for
 * them — and only those. What it will not touch is in `autopilot-policy`.
 */
const autopilot = new Autopilot({
  isActive: (runId) => {
    const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
    if (!session) return false;

    // Only agent runs are tracked, and only they are ever typed into: a dev
    // server asking something is not a prompt this understands.
    return attentionDetector.isTracked(runId) && isAutopilotActive(session.projectPath);
  },
  getScreen: (runId) => attentionDetector.screen(runId),
  isWaiting: (runId) => attentionDetector.isWaiting(runId),
  answer: (runId, keys) => {
    // Clearing without emitting: the waiting state was never announced, so
    // there is no alert to take back — only the detector's own turn bookkeeping
    // to bring in line with the answer that just went in.
    attentionDetector.clear(runId);
    ptyRunner.write(runId, keys);
  },
  onAnswered: emitAutopilotAnswer,
  onHeld: (runId, detail) => emitAttention(runId, true, detail.hold)
});

// How long a renderer that loaded but never signalled gets before the window is
// shown anyway. Long enough to cover a slow first mount, short enough that a
// broken renderer is not hidden behind the splash.
const RENDERER_PAINT_GRACE_MS = 2500;

// Drops the splash and puts the real window up. Guarded on visibility because
// every path below can fire more than once, and on a reload the window is
// already up — only the first caller should be doing any of this.
function revealWindow(window: BrowserWindow) {
  if (window.isDestroyed() || window.isVisible()) return;
  closeSplash();
  window.show();
  window.focus();
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    // Held back until React has painted — the splash covers the gap, and a
    // window shown before then is the blank frame it exists to replace.
    show: false,
    // The navy the renderer boots into, so the splash hands over to the same
    // colour rather than flashing through a lighter one.
    backgroundColor: "#0b1220",
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      // Powers the agent preview browser. The guest is locked to loopback by
      // `guardPreviewWebviews` — everything else leaves for the real browser.
      webviewTag: true,
      // Chromium's PDF viewer counts as a plugin; without this the editor's
      // PDF preview frame renders nothing.
      plugins: true
    }
  });

  // Without this, Windows' taskbar button group (right-click menu, jump list)
  // falls back to Chromium's generic "Electron" identity — separate from both
  // the window's own icon above and the icon rcedit embeds in the .exe, and
  // not covered by either.
  if (process.platform === "win32") {
    window.setAppDetails({
      appId: "com.lazify.desktop",
      appIconPath: process.execPath,
      appIconIndex: 0,
      relaunchCommand: `"${process.execPath}"`,
      relaunchDisplayName: "Lazify"
    });
  }

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;

  if (devServerUrl) {
    void window.loadURL(devServerUrl);
  } else {
    void window.loadFile(path.join(app.getAppPath(), "dist/index.html"));
  }

  // The renderer normally reveals itself once React paints. These two are the
  // backstops: JS that loaded but never got that far, and a load that failed
  // outright — in both cases the splash has nothing left to wait for.
  window.webContents.on("did-finish-load", () => {
    setTimeout(() => revealWindow(window), RENDERER_PAINT_GRACE_MS);
  });

  window.webContents.on("did-fail-load", () => revealWindow(window));

  return window;
}

function registerIpcHandlers() {
  // Sent by the renderer once React has committed its first paint. Resolving the
  // window from the sender means a window rebuilt from `activate` reveals itself
  // the same way the first one did.
  ipcMain.on("lazify:renderer-ready", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) revealWindow(window);
  });

  registerDomainHandlers({
    get mainWindow() {
      return mainWindow;
    },
    emitToRenderer,
    focusRun,
    emitAttention,
    commandRunner,
    workflowEngine,
    ptyRunner,
    autopilot,
    attentionDetector
  });
}

app.whenReady().then(() => {
  // First, so anything that fails below is written down rather than lost.
  installCrashHandlers();
  normalizeRuntimePath();
  // Sweeps up anything a previous run was killed before it could delete.
  cleanupShadowRepos();
  // Must be in place before any window — and so any `<webview>` — exists.
  // A popped-out link from the browser page comes back as a new tab.
  guardPreviewWebviews(
    (url, background) => emitToRenderer("lazify:browser-open-tab", { url, background }),
    // A popup is decided before any request exists, so the shield has to be
    // consulted here or an ad popup becomes a tab the filter can no longer stop.
    shouldBlockPopup,
    // Held back rather than thrown away: the browser page offers it in a strip
    // so a popup the user actually wanted is one click from opening.
    (blocked) => emitToRenderer("lazify:browser-popup-blocked", blocked)
  );

  // Must precede the first page in a restored tab, or it loads under Electron's
  // defaults — where a site asking for notifications is simply told yes.
  installBrowserPermissionPolicy();

  // Only now, once the guard above is registered — it has to see every window
  // this app opens, and the splash is a window. Still ahead of the shield's
  // engine load and the scans below, which are the slow part of a cold start.
  showSplash();

  // Restores the saved shield preference before the browser page loads anything.
  void initLazyShield((blocked) => emitToRenderer("lazify:lazy-shield-blocked", { blocked }));

  // Behind the picker, never in front of it: the bundled catalog already
  // answers `lazify:templates`, so a slow network delays nothing.
  void refreshCatalog();

  // There is one floating window and a button for it on more than one surface,
  // so every change — opened, re-pointed, closed from its own title bar — has to
  // reach all of them, or a toggle is left claiming something untrue.
  onPictureInPictureChanged((state) =>
    emitToRenderer("lazify:picture-in-picture-changed", state)
  );

  if (process.platform === "darwin") {
    app.dock?.setIcon(APP_ICON_PATH);
  }

  registerIpcHandlers();
  mainWindow = createMainWindow();
  watchWindowCrashes(mainWindow);

  // A floater outliving the window that opened it would keep the app running
  // with nothing to drive it — and on macOS it would also stop the dock icon
  // from bringing the real window back.
  mainWindow.on("closed", () => closePictureInPicture());

  // Wired after the window exists, so the first state change has somewhere to
  // go. Nothing is checked until the user asks from Settings.
  initUpdater((state) => emitToRenderer("lazify:update-state-changed", state));

  // The usage panel listens for this instead of polling on a timer.
  stopAgentActivityWatch = watchAgentActivity((event) =>
    emitToRenderer("lazify:agent-activity", event)
  );

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      showSplash();
      mainWindow = createMainWindow();
    }
  });
});

// The shadow repos are session scratch space, so they leave with the session.
app.on("will-quit", () => {
  cleanupShadowRepos();
  stopAgentActivityWatch?.();
  stopAgentActivityWatch = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
