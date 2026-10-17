import type { UpdateProgress, UpdatesStatus } from "@chain/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UpdateState } from "@/shared/types/updates";

const mocks = vi.hoisted(() => ({
	status: { supported: true, currentVersion: "1.0.0" } as UpdatesStatus,
	progress: null as ((progress: UpdateProgress) => void) | null,
	check: vi.fn(),
	download: vi.fn(),
	installAndRelaunch: vi.fn(),
}));

vi.mock("@chain/sdk", () => ({
	desktop: {
		updates: {
			status: async () => mocks.status,
			check: mocks.check,
			download: mocks.download,
			installAndRelaunch: mocks.installAndRelaunch,
			onProgress: (listener: (progress: UpdateProgress) => void) => {
				mocks.progress = listener;
				return () => {
					mocks.progress = null;
				};
			},
		},
	},
}));

/** A fresh module per test: the updater keeps its state at module scope. */
async function loadUpdater(status: Partial<UpdatesStatus> = {}) {
	vi.resetModules();
	mocks.status = { supported: true, currentVersion: "1.0.0", ...status };
	mocks.check.mockReset().mockResolvedValue(null);
	mocks.download.mockReset().mockResolvedValue(undefined);
	mocks.installAndRelaunch.mockReset().mockResolvedValue(undefined);

	const updater = await import("@/platform/updates");
	const published: UpdateState[] = [];
	updater.onUpdateStateChanged((state) => published.push(state));

	return { ...updater, published };
}

const RELEASE = { version: "1.1.0", date: "2026-10-17T00:00:00Z", notes: "Fixes" };

beforeEach(() => {
	mocks.progress = null;
});

describe("updater", () => {
	it("leaves downloading to the user rather than starting on its own", async () => {
		const updater = await loadUpdater();
		mocks.check.mockResolvedValue(RELEASE);

		await updater.checkForUpdates();

		expect(mocks.download).not.toHaveBeenCalled();
	});

	it("does nothing in development, where there is no app to replace", async () => {
		const updater = await loadUpdater({ supported: false, reason: "dev-build" });

		const unsupported = { status: "unsupported", reason: "development" };
		expect(await updater.getUpdateState()).toEqual(unsupported);
		expect(await updater.checkForUpdates()).toEqual(unsupported);
		expect(await updater.downloadUpdate()).toEqual(unsupported);
		expect(mocks.check).not.toHaveBeenCalled();
		expect(mocks.download).not.toHaveBeenCalled();
	});

	it("says so when this copy can't be replaced where it's installed, or has no feed", async () => {
		const readOnly = await loadUpdater({ supported: false, reason: "read-only" });
		expect(await readOnly.checkForUpdates()).toEqual({ status: "unsupported", reason: "read-only" });

		const unconfigured = await loadUpdater({ supported: false, reason: "not-configured" });
		expect(await unconfigured.checkForUpdates()).toEqual({ status: "unsupported", reason: "not-configured" });
	});

	it("reports what the updater finds, all the way to ready-to-install", async () => {
		const updater = await loadUpdater();
		mocks.check.mockResolvedValue(RELEASE);
		mocks.download.mockImplementation(async () => {
			mocks.progress?.({ downloaded: 425, total: 1000 });
		});

		expect(await updater.checkForUpdates()).toEqual({
			status: "available",
			version: "1.1.0",
			releaseDate: "2026-10-17T00:00:00Z",
			releaseNotes: "Fixes",
		});

		expect(await updater.downloadUpdate()).toEqual({ status: "downloaded", version: "1.1.0" });
		expect(updater.published.find((state) => state.status === "downloading" && state.transferred === 425)).toMatchObject({
			percent: 42.5,
			total: 1000,
		});
		expect(mocks.progress).toBeNull();

		expect(updater.published.map((state) => state.status)).toEqual([
			"checking",
			"available",
			"downloading",
			"downloading",
			"downloaded",
		]);
	});

	it("names the running version when there is nothing newer", async () => {
		const updater = await loadUpdater();

		expect(await updater.checkForUpdates()).toEqual({ status: "current", version: "1.0.0" });
	});

	it("will not restart into an update that has not been downloaded", async () => {
		const updater = await loadUpdater();
		mocks.check.mockResolvedValue(RELEASE);

		await updater.checkForUpdates();
		await updater.quitAndInstallUpdate();
		expect(mocks.installAndRelaunch).not.toHaveBeenCalled();

		await updater.downloadUpdate();
		await updater.quitAndInstallUpdate();
		expect(mocks.installAndRelaunch).toHaveBeenCalledOnce();
	});

	it("reports a failed check or a download that doesn't verify instead of throwing at the caller", async () => {
		const updater = await loadUpdater();
		mocks.check.mockRejectedValueOnce(new Error("The update feed couldn't be reached."));

		expect(await updater.checkForUpdates()).toEqual({ status: "error", message: "The update feed couldn't be reached." });

		mocks.check.mockResolvedValue(RELEASE);
		await updater.checkForUpdates();
		mocks.download.mockRejectedValueOnce(new Error("The update's signature doesn't verify."));
		expect(await updater.downloadUpdate()).toEqual({ status: "error", message: "The update's signature doesn't verify." });
	});

	it("finds an update downloaded before the page reloaded still waiting", async () => {
		const updater = await loadUpdater({ downloaded: "1.1.0" });

		expect(await updater.getUpdateState()).toEqual({ status: "downloaded", version: "1.1.0" });
	});
});
