import { beforeEach, describe, expect, it, vi } from "vitest";

let files: Record<string, string> = {};
let pageZoom = 1;
let assertion: string | null = null;
let assertionCalls: string[] = [];

vi.mock("@chain/sdk", () => ({
	desktop: {
		pageZoom: {
			set: async (factor: number) => {
				pageZoom = factor;
			},
			get: async () => pageZoom,
		},
		keepAwake: {
			start: async (reason: string) => {
				assertion = reason;
				assertionCalls.push("start");
			},
			stop: async () => {
				assertion = null;
				assertionCalls.push("stop");
			},
		},
	},
}));

vi.mock("@/platform/folders", () => ({
	appDataPath: async () => "/app",
	readTextFile: async (path: string) => files[path] ?? null,
	writeTextFile: async (path: string, text: string) => {
		files[path] = text;
	},
}));

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	files = {};
	pageZoom = 1;
	assertion = null;
	assertionCalls = [];
	vi.resetModules();
});

describe("page zoom", () => {
	it("steps through Electron's zoom levels and stops at the ends", async () => {
		const zoom = await import("@/platform/zoom");

		expect(await zoom.stepZoom(1)).toBe(1.1);
		expect(await zoom.stepZoom(1)).toBe(1.25);
		await zoom.setZoom(2);
		expect(await zoom.stepZoom(1)).toBe(2);
		await zoom.setZoom(0.5);
		expect(await zoom.stepZoom(-1)).toBe(0.5);
		expect(await zoom.stepZoom(1)).toBe(0.67);
	});

	it("clamps, persists in Electron's format, applies to the page and tells listeners", async () => {
		const zoom = await import("@/platform/zoom");
		const changes: number[] = [];
		zoom.onZoomChanged((factor) => changes.push(factor));

		expect(await zoom.setZoom(9)).toBe(2);
		expect(await zoom.setZoom(Number.NaN)).toBe(1);
		expect(await zoom.setZoom(1.333)).toBe(1.33);

		expect(changes).toEqual([2, 1, 1.33]);
		expect(pageZoom).toBe(1.33);
		expect(JSON.parse(files["/app/window-zoom.json"])).toEqual({ factor: 1.33 });
		expect(await zoom.resetZoom()).toBe(1);
	});

	it("applies the stored zoom at startup, and reads 100% when nothing is stored", async () => {
		const zoom = await import("@/platform/zoom");
		await expect(zoom.readZoom()).resolves.toBe(1);

		files["/app/window-zoom.json"] = JSON.stringify({ factor: 1.5 });
		await zoom.applyStoredZoom();

		expect(pageZoom).toBe(1.5);
	});
});

describe("keep awake", () => {
	it("is on unless turned off, as in Electron", async () => {
		const keepAwake = await import("@/platform/keep-awake");

		await expect(keepAwake.keepAwake()).resolves.toBe(true);
		files["/app/keep-awake.json"] = JSON.stringify({ enabled: false });
		await expect(keepAwake.keepAwake()).resolves.toBe(false);
	});

	it("holds one assertion while any agent is busy, and lets go when none is", async () => {
		const keepAwake = await import("@/platform/keep-awake");

		keepAwake.setAgentBusy("run-1", true);
		await settle();
		keepAwake.setAgentBusy("run-2", true);
		await settle();
		expect(assertion).toBe("Lazify: an agent is working");

		keepAwake.setAgentBusy("run-1", false);
		await settle();
		expect(assertion).not.toBeNull();
		keepAwake.setAgentBusy("run-2", false);
		await settle();

		expect(assertion).toBeNull();
		expect(assertionCalls).toEqual(["start", "stop"]);
	});

	it("follows the switch, even mid-run", async () => {
		const keepAwake = await import("@/platform/keep-awake");
		keepAwake.setAgentBusy("run-1", true);
		await settle();

		await keepAwake.setKeepAwake(false);
		expect(assertion).toBeNull();
		await keepAwake.setKeepAwake(true);
		expect(assertion).not.toBeNull();
		expect(JSON.parse(files["/app/keep-awake.json"])).toEqual({ enabled: true });
	});
});
