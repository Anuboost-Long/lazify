import path from "node:path";

import { app, BrowserWindow, ipcMain, Notification } from "electron";

import { watchAgentActivity } from "./agents/agent-activity-watcher";
import { cleanupShadowRepos } from "./agents/agent-changes";
import { AttentionDetector } from "./agents/attention-detector";
import { Autopilot, type AutopilotAnswered } from "./agents/autopilot";
import type { AutopilotHold } from "./agents/autopilot-policy";
import { isAutopilotActive } from "./agents/autopilot-store";
import { clearAgentSessionDirs } from "./agents/session-lint";
import { buildAppMenu } from "./app-menu";
import { installBrowserPermissionPolicy } from "./browser/browser-permissions";
import { attachBrowserPreloads } from "./browser/browser-preloads";
import { initLazyShield, shouldBlockPopup } from "./browser/lazy-shield";
import { guardPreviewWebviews } from "./browser/preview-guard";
import { registerSwipeNavigation } from "./browser/swipe-navigation";
import { CommandRunner } from "./command-runner";
import { installCrashHandlers, watchWindowCrashes } from "./diagnostics/crash-handlers";
import { logWarn } from "./diagnostics/logger";
import { normalizeRuntimePath } from "./environment/runtime-path";
import { formatChangedFiles, getFormatterSettings } from "./formatting";
import { APP_ICON_PATH } from "./icon-path";
import { registerDomainHandlers } from "./ipc";
import { disposeLanguageServers, disposeLintBridge } from "./linting";
import { closePictureInPicture, onPictureInPictureChanged } from "./media/picture-in-picture";
import { initPromptBuilder } from "./prompts";
import { PtyRunner } from "./pty-runner";
import { refreshCatalog } from "./scaffolding/catalog";
import { WorkflowEngine } from "./scaffolding/workflow-engine";
import { closeSplash, showSplash } from "./splash";
import { initUpdater } from "./updater";
import { holdZoomSteady, stepZoom } from "./window-zoom";

if (process.platform === "win32") {
	app.setAppUserModelId("com.lazify.desktop");
}

let mainWindow: BrowserWindow | null = null;
let stopAgentActivityWatch: (() => void) | null = null;

const emitToRenderer = (channel: string, payload: unknown) => {
	if (!mainWindow || mainWindow.isDestroyed()) return;

	mainWindow.webContents.send(channel, payload);
};

const commandRunner = new CommandRunner(
	(event) => emitToRenderer("lazify:log", event),
	(prompt) => emitToRenderer("lazify:command-choice-prompt", prompt),
);
const workflowEngine = new WorkflowEngine(commandRunner, (event) =>
	emitToRenderer("lazify:workflow-progress", event),
);
const attentionDetector = new AttentionDetector((runId) => emitTurnDone(runId));

const emitAttention = (runId: string, waiting: boolean, hold: AutopilotHold | null = null) => {
	const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
	if (!session) return;

	emitToRenderer("lazify:agent-attention", {
		runId,
		projectPath: session.projectPath,
		projectName: session.projectName,
		agentLabel: session.scriptName,
		waiting,
		hold,
	});

	if (!waiting || mainWindow?.isFocused()) return;

	if (Notification.isSupported()) {
		new Notification({
			title: `${session.scriptName} needs you`,
			body: `${session.projectName} is waiting for a response.`,
			icon: APP_ICON_PATH,
		}).show();
	}

	app.dock?.bounce("informational");
};

const focusRun = (payload: { runId: string; projectPath: string }) => {
	if (mainWindow?.isMinimized()) mainWindow.restore();
	mainWindow?.show();
	mainWindow?.focus();

	emitToRenderer("lazify:agent-focus", payload);
};

const formatAfterTurn = async (projectPath: string) => {
	if (getFormatterSettings().mode !== "auto") return;

	try {
		const outcome = await formatChangedFiles(projectPath);

		if (outcome.formatted.length === 0 && outcome.failed.length === 0) return;

		emitToRenderer("lazify:code-formatted", { projectPath, ...outcome });
	} catch (error) {
		logWarn("formatting", "Could not format after the turn ended", {
			projectPath,
			error,
		});
	}
};

const emitTurnDone = (runId: string) => {
	const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
	if (!session) return;

	const payload = {
		runId,
		projectPath: session.projectPath,
		projectName: session.projectName,
		agentLabel: session.scriptName,
	};

	emitToRenderer("lazify:agent-done", payload);

	void formatAfterTurn(session.projectPath);

	if (mainWindow?.isFocused()) return;

	if (Notification.isSupported()) {
		const notification = new Notification({
			title: `${session.scriptName} is done`,
			body: `${session.projectName} finished the task you gave it.`,
			icon: APP_ICON_PATH,
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

		if (waiting && autopilot.willConsider(event.runId)) {
			autopilot.consider(event.runId);
			return;
		}

		emitAttention(event.runId, waiting);
	},
	(event) => {
		emitToRenderer("lazify:script-status", event);

		if (typeof event.exitCode === "number" && event.exitCode !== 0) {
			logWarn("scripts", `"${event.scriptName}" exited with ${event.exitCode}`, {
				runId: event.runId,
			});
		}

		if (event.status === "done" || event.status === "error") {
			attentionDetector.forget(event.runId);
			autopilot.forget(event.runId);
		}
	},
);

const emitAutopilotAnswer = (runId: string, detail: AutopilotAnswered) => {
	const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
	if (!session) return;

	emitToRenderer("lazify:autopilot-answered", {
		runId,
		projectPath: session.projectPath,
		projectName: session.projectName,
		agentLabel: session.scriptName,
		question: detail.question,
		optionLabel: detail.optionLabel,
	});
};

const autopilot = new Autopilot({
	isActive: (runId) => {
		const session = ptyRunner.getSessions().find((entry) => entry.runId === runId);
		if (!session) return false;

		return attentionDetector.isTracked(runId) && isAutopilotActive(session.projectPath);
	},
	getScreen: (runId) => attentionDetector.screen(runId),
	isWaiting: (runId) => attentionDetector.isWaiting(runId),
	answer: (runId, keys) => {
		attentionDetector.clear(runId);
		ptyRunner.write(runId, keys);
	},
	onAnswered: emitAutopilotAnswer,
	onHeld: (runId, detail) => emitAttention(runId, true, detail.hold),
});

const RENDERER_PAINT_GRACE_MS = 2500;

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
		show: false,
		backgroundColor: "#0b1220",
		icon: APP_ICON_PATH,
		webPreferences: {
			preload: path.join(__dirname, "../preload/index.js"),
			nodeIntegration: false,
			contextIsolation: true,
			sandbox: true,
			webviewTag: true,
			plugins: true,
		},
	});

	if (process.platform === "win32") {
		window.setAppDetails({
			appId: "com.lazify.desktop",
			appIconPath: process.execPath,
			appIconIndex: 0,
			relaunchCommand: `"${process.execPath}"`,
			relaunchDisplayName: "Lazify",
		});
	}

	const devServerUrl = process.env.VITE_DEV_SERVER_URL;

	if (devServerUrl) {
		void window.loadURL(devServerUrl);
	} else {
		void window.loadFile(path.join(app.getAppPath(), "dist/index.html"));
	}

	window.webContents.on("did-finish-load", () => {
		holdZoomSteady(window);
		setTimeout(() => revealWindow(window), RENDERER_PAINT_GRACE_MS);
	});

	window.webContents.on("zoom-changed", (_event, direction) => {
		stepZoom(window, direction === "in" ? 1 : -1);
	});

	window.webContents.on("did-fail-load", () => revealWindow(window));

	return window;
}

function registerIpcHandlers() {
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
		attentionDetector,
	});
}

app.whenReady().then(() => {
	installCrashHandlers();
	normalizeRuntimePath();
	cleanupShadowRepos();
	clearAgentSessionDirs();
	guardPreviewWebviews(
		(url, background) => emitToRenderer("lazify:browser-open-tab", { url, background }),
		shouldBlockPopup,
		(blocked) => emitToRenderer("lazify:browser-popup-blocked", blocked),
	);

	installBrowserPermissionPolicy();

	attachBrowserPreloads();
	registerSwipeNavigation((progress) => emitToRenderer("lazify:browser-swipe-progress", progress));

	showSplash();

	initPromptBuilder();

	void initLazyShield((blocked) => emitToRenderer("lazify:lazy-shield-blocked", { blocked }));

	void refreshCatalog();

	onPictureInPictureChanged((state) => emitToRenderer("lazify:picture-in-picture-changed", state));

	if (process.platform === "darwin") {
		app.dock?.setIcon(APP_ICON_PATH);
	}

	registerIpcHandlers();
	buildAppMenu(() => mainWindow);
	mainWindow = createMainWindow();
	watchWindowCrashes(mainWindow);

	mainWindow.on("closed", () => {
		mainWindow = null;
		closePictureInPicture();
	});

	initUpdater((state) => emitToRenderer("lazify:update-state-changed", state));

	stopAgentActivityWatch = watchAgentActivity((event) =>
		emitToRenderer("lazify:agent-activity", event),
	);

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			showSplash();
			mainWindow = createMainWindow();
		}
	});
});

app.on("will-quit", () => {
	cleanupShadowRepos();
	disposeLanguageServers();
	disposeLintBridge();
	clearAgentSessionDirs();
	stopAgentActivityWatch?.();
	stopAgentActivityWatch = null;
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});
