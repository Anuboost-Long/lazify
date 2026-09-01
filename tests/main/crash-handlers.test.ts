import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	app: {
		isReady: vi.fn(() => true),
		quit: vi.fn(),
		exit: vi.fn(),
		getVersion: () => "1.0.0",
		getPath: () => "/tmp/lazify-test-logs",
		on: vi.fn(),
	},
	dialog: { showMessageBoxSync: vi.fn(() => 0) },
	shell: { showItemInFolder: vi.fn() },
	crashReporter: { start: vi.fn() },
	logError: vi.fn(),
	logInfo: vi.fn(),
}));

vi.mock("electron", () => ({
	app: mocks.app,
	dialog: mocks.dialog,
	shell: mocks.shell,
	crashReporter: mocks.crashReporter,
}));

vi.mock("../../src/main/diagnostics/logger", () => ({
	logError: mocks.logError,
	logInfo: mocks.logInfo,
	getLogFilePath: () => "/tmp/lazify-test-logs/lazify.log",
}));

/** A stand-in for the window, capturing the handlers it is given. */
function fakeWindow() {
	const handlers = new Map<string, (...args: unknown[]) => void>();

	return {
		reload: vi.fn(),
		webContents: {
			on: (event: string, handler: (...args: unknown[]) => void) => {
				handlers.set(event, handler);
			},
		},
		fire: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
	};
}

async function loadHandlers() {
	const mod = await import("../../src/main/diagnostics/crash-handlers");
	mod.resetShutdownStateForTests();
	return mod;
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.app.isReady.mockReturnValue(true);
	mocks.dialog.showMessageBoxSync.mockReturnValue(0);
	vi.useFakeTimers();
});

describe("fatal errors in the main process", () => {
	it("writes the error down, tells the user, and quits", async () => {
		const { handleFatalError } = await loadHandlers();

		handleFatalError("main", new Error("kaboom"));

		expect(mocks.logError).toHaveBeenCalledWith(
			"main",
			"Fatal error, shutting down",
			expect.any(Error),
		);
		expect(mocks.dialog.showMessageBoxSync).toHaveBeenCalledOnce();
		// quit(), not exit() — will-quit cleanup gets to run.
		expect(mocks.app.quit).toHaveBeenCalledOnce();
		expect(mocks.app.exit).not.toHaveBeenCalled();
	});

	it("forces the exit if the quit hangs", async () => {
		const { handleFatalError } = await loadHandlers();

		handleFatalError("main", new Error("kaboom"));
		expect(mocks.app.exit).not.toHaveBeenCalled();

		vi.advanceTimersByTime(3000);
		expect(mocks.app.exit).toHaveBeenCalledWith(1);
	});

	it("opens the log when the user asks for it", async () => {
		const { handleFatalError } = await loadHandlers();
		mocks.dialog.showMessageBoxSync.mockReturnValue(1);

		handleFatalError("main", new Error("kaboom"));

		expect(mocks.shell.showItemInFolder).toHaveBeenCalledWith("/tmp/lazify-test-logs/lazify.log");
		expect(mocks.app.quit).toHaveBeenCalledOnce();
	});

	it("leaves immediately when it fails before the app is ready", async () => {
		const { handleFatalError } = await loadHandlers();
		mocks.app.isReady.mockReturnValue(false);

		handleFatalError("main", new Error("too early"));

		// No window exists to parent a dialog to, and no cleanup worth running.
		expect(mocks.dialog.showMessageBoxSync).not.toHaveBeenCalled();
		expect(mocks.app.exit).toHaveBeenCalledWith(1);
		expect(mocks.app.quit).not.toHaveBeenCalled();
	});

	it("does not prompt twice when a second error lands mid-shutdown", async () => {
		const { handleFatalError } = await loadHandlers();

		handleFatalError("main", new Error("first"));
		handleFatalError("main", new Error("second"));

		expect(mocks.dialog.showMessageBoxSync).toHaveBeenCalledOnce();
		expect(mocks.app.quit).toHaveBeenCalledOnce();
		expect(mocks.logError).toHaveBeenCalledWith(
			"main",
			"Further error while shutting down",
			expect.any(Error),
		);
	});
});

describe("renderer crashes", () => {
	it("offers a reload, because a dead renderer is recoverable", async () => {
		const { watchWindowCrashes } = await loadHandlers();
		const window = fakeWindow();
		watchWindowCrashes(window as never);

		window.fire("render-process-gone", {}, { reason: "crashed", exitCode: 133 });

		expect(window.reload).toHaveBeenCalledOnce();
		expect(mocks.app.quit).not.toHaveBeenCalled();
	});

	it("quits instead when the user picks Quit", async () => {
		const { watchWindowCrashes } = await loadHandlers();
		const window = fakeWindow();
		watchWindowCrashes(window as never);
		mocks.dialog.showMessageBoxSync.mockReturnValue(1);

		window.fire("render-process-gone", {}, { reason: "crashed", exitCode: 133 });

		expect(window.reload).not.toHaveBeenCalled();
		expect(mocks.app.quit).toHaveBeenCalledOnce();
	});

	it("stays quiet on a clean exit, which is what a normal quit looks like", async () => {
		const { watchWindowCrashes } = await loadHandlers();
		const window = fakeWindow();
		watchWindowCrashes(window as never);

		window.fire("render-process-gone", {}, { reason: "clean-exit", exitCode: 0 });

		expect(mocks.dialog.showMessageBoxSync).not.toHaveBeenCalled();
		expect(window.reload).not.toHaveBeenCalled();
	});
});

/**
 * Closing the terminal that ran `yarn dev` is the case both of these come from:
 * stdout breaks under a healthy app, and the signal that follows has to reach
 * `will-quit` or every language server it started is left orphaned.
 */
describe("shutting down from the terminal", () => {
	const install = async () => {
		const listeners = new Map<string, (...args: unknown[]) => void>();
		const spy = vi
			.spyOn(process, "on")
			.mockImplementation((event: string | symbol, handler: (...args: never[]) => void) => {
				listeners.set(String(event), handler as (...args: unknown[]) => void);
				return process;
			});

		const { installCrashHandlers } = await loadHandlers();
		installCrashHandlers();
		spy.mockRestore();

		return listeners;
	};

	it("drops a write to a closed pipe instead of putting up a crash dialog", async () => {
		const listeners = await install();

		listeners.get("uncaughtException")?.(Object.assign(new Error("write EPIPE"), { code: "EPIPE" }));

		expect(mocks.dialog.showMessageBoxSync).not.toHaveBeenCalled();
		expect(mocks.app.quit).not.toHaveBeenCalled();
	});

	it("turns a terminal signal into a quit, so cleanup runs", async () => {
		const listeners = await install();

		listeners.get("SIGHUP")?.();

		expect(mocks.app.quit).toHaveBeenCalledOnce();
	});
});
