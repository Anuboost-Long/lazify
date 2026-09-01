import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InstallProgress } from "../../../src/main/extensions/types";

/**
 * The install has to survive the window that started it, so what these hold
 * still is the bookkeeping around it: one run per extension however many times
 * it is asked for, a run that is still there to be read afterwards, and nothing
 * downloaded for an engine whose runtime is missing.
 */

const requirement: {
	satisfied: boolean;
	label: string | null;
	note: string | null;
	helpUrl: string | null;
} = { satisfied: true, label: null, note: null, helpUrl: null };

let report: ((progress: InstallProgress) => void) | null = null;
let settle: { resolve: () => void; reject: (cause: Error) => void } | null = null;
let installCalls = 0;

vi.mock("../../../src/main/extensions/providers", () => ({
	providerFor: (id: string) =>
		id === "known" ? { entry: { id }, requirement: () => requirement } : null,
}));

vi.mock("../../../src/main/extensions/project-manifest", () => ({
	refreshWrittenManifests: async () => undefined,
}));

vi.mock("../../../src/main/extensions/manager", () => ({
	installExtension: (_id: string, onProgress: (progress: InstallProgress) => void) => {
		installCalls += 1;
		report = onProgress;

		return new Promise<void>((resolve, reject) => {
			settle = { resolve, reject };
		});
	},
}));

const { beginInstall, installJobs, isInstalling, onInstallProgress } =
	await import("../../../src/main/extensions/install-jobs");

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	installCalls = 0;
	requirement.satisfied = true;
	requirement.note = null;
});

describe("beginInstall", () => {
	it("reports its way through the stages and stays readable afterwards", async () => {
		const seen: string[] = [];
		const stop = onInstallProgress((job) => seen.push(job.stage));

		expect(beginInstall("known").stage).toBe("queued");

		report?.({ stage: "downloading", receivedBytes: 512, totalBytes: 1024 });
		report?.({ stage: "unpacking" });
		settle?.resolve();
		await flush();

		stop();

		expect(seen).toEqual(["queued", "downloading", "unpacking", "done"]);
		expect(installJobs().find((job) => job.id === "known")?.stage).toBe("done");
	});

	it("hands back the run already going rather than starting a second", async () => {
		beginInstall("known");
		const again = beginInstall("known");

		expect(installCalls).toBe(1);
		expect(isInstalling(again)).toBe(true);

		settle?.resolve();
		await flush();
	});

	it("keeps why an install failed, for the card that has to say so", async () => {
		beginInstall("known");
		settle?.reject(new Error("Open VSX is not reachable"));
		await flush();

		const job = installJobs().find((entry) => entry.id === "known");

		expect(job?.stage).toBe("failed");
		expect(job?.error).toBe("Open VSX is not reachable");
	});

	it("downloads nothing for an engine whose runtime is missing", () => {
		requirement.satisfied = false;
		requirement.note = "No Java 21+ runtime was found";

		const job = beginInstall("known");

		expect(installCalls).toBe(0);
		expect(job.stage).toBe("failed");
		expect(job.error).toBe("No Java 21+ runtime was found");
	});
});
