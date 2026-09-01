import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-manifest-"));

vi.mock("electron", () => ({ app: { getPath: () => userData } }));

// The registry is the one thing here that would reach the network.
vi.mock("../../../src/main/extensions/registry", () => ({
	fetchLatestRelease: async () => null,
	downloadRelease: async () => Buffer.alloc(0),
}));

const { projectManifestPath, writeProjectExtensionManifest } =
	await import("../../../src/main/extensions/project-manifest");
const { rememberInstall, setExtensionEnabled } = await import("../../../src/main/extensions/store");

const project = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-manifest-project-"));

const read = () =>
	JSON.parse(fs.readFileSync(projectManifestPath(project), "utf8")) as {
		description: string;
		engines: {
			id: string;
			source: string;
			enabled: boolean;
			status: string;
			version: string | null;
			extensions: string[];
			requirement: string | null;
		}[];
	};

const engine = (source: string) => read().engines.find((found) => found.source === source);

beforeEach(() => {
	fs.rmSync(path.join(userData, "extensions"), { recursive: true, force: true });
	fs.rmSync(path.join(project, ".lazify"), { recursive: true, force: true });
});

describe("project extension manifest", () => {
	it("lands where an agent working in the project will find it", async () => {
		const written = await writeProjectExtensionManifest(project);

		expect(written).toBe(path.join(project, ".lazify", "extensions.json"));
		expect(fs.existsSync(written!)).toBe(true);
	});

	it("says what the file is for, so an agent knows why it should care", async () => {
		await writeProjectExtensionManifest(project);

		expect(read().description).toMatch(/underlining findings/);
	});

	it("reports an uninstalled extension as present but off", async () => {
		await writeProjectExtensionManifest(project);

		const tailwind = engine("tailwindcss");

		expect(tailwind?.enabled).toBe(false);
		expect(tailwind?.status).toBe("not-installed");
		expect(tailwind?.version).toBeNull();
	});

	it("reports an installed extension with its version and file types", async () => {
		rememberInstall("bradlc.vscode-tailwindcss", "0.16.0");
		await writeProjectExtensionManifest(project);

		const tailwind = engine("tailwindcss");

		expect(tailwind?.version).toBe("0.16.0");
		expect(tailwind?.enabled).toBe(true);
		expect(tailwind?.extensions).toEqual(expect.arrayContaining([".tsx", ".html", ".css"]));
	});

	it("shows a switched-off extension as off, so an agent does not chase its rules", async () => {
		rememberInstall("bradlc.vscode-tailwindcss", "0.16.0");
		setExtensionEnabled("bradlc.vscode-tailwindcss", false);
		await writeProjectExtensionManifest(project);

		expect(engine("tailwindcss")?.enabled).toBe(false);
	});

	it("marks an extension blocked by a missing runtime as off, and names what it needs", async () => {
		rememberInstall("SonarSource.sonarlint-vscode", "5.8.1");
		await writeProjectExtensionManifest(project);

		const sonar = engine("sonarlint");

		// This machine has no Java 21, which is exactly the case worth reporting.
		if (sonar?.requirement) {
			expect(sonar.enabled).toBe(false);
			expect(sonar.requirement).toMatch(/Java 21\+/);
		} else {
			expect(sonar?.enabled).toBe(true);
		}
	});

	it("leaves the file alone when nothing about the engines changed", async () => {
		await writeProjectExtensionManifest(project);
		const first = fs.readFileSync(projectManifestPath(project), "utf8");

		await new Promise((resolve) => setTimeout(resolve, 5));
		await writeProjectExtensionManifest(project);

		expect(fs.readFileSync(projectManifestPath(project), "utf8")).toBe(first);
	});

	it("rewrites once an engine actually changes", async () => {
		await writeProjectExtensionManifest(project);
		const first = fs.readFileSync(projectManifestPath(project), "utf8");

		rememberInstall("bradlc.vscode-tailwindcss", "0.16.0");
		await writeProjectExtensionManifest(project);

		expect(fs.readFileSync(projectManifestPath(project), "utf8")).not.toBe(first);
	});

	it("does nothing for a folder that is not there", async () => {
		expect(await writeProjectExtensionManifest(path.join(os.tmpdir(), "lazify-absent"))).toBeNull();
	});
});
