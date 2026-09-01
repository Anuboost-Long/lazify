import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-sonarlint-"));

vi.mock("electron", () => ({ app: { getPath: () => userData } }));

const { sonarlint } = await import("../../../src/main/extensions/providers/sonarlint");
const javaRuntime = await import("../../../src/main/extensions/java-runtime");

const root = path.join(userData, "unpacked");

afterEach(() => {
	vi.restoreAllMocks();
	javaRuntime.forgetJavaRuntime();
});

const withJava = (major: number | null) =>
	vi
		.spyOn(javaRuntime, "findJavaRuntime")
		.mockReturnValue(major === null ? null : { path: "/opt/java/bin/java", major });

describe("sonarlint provider", () => {
	it("names the server jar the unpack has to produce", () => {
		expect(sonarlint.serverMarker).toBe(path.join("server", "sonarlint-ls.jar"));
	});

	it("builds the argv SonarLint's own launcher builds", () => {
		withJava(21);

		const launch = sonarlint.launch(root);

		expect(launch?.command).toBe("/opt/java/bin/java");
		expect(launch?.args.slice(0, 4)).toEqual([
			"-Dsonarlint.telemetry.disabled=true",
			"-jar",
			path.join(root, "server", "sonarlint-ls.jar"),
			"-stdio",
		]);
		expect(launch?.args[4]).toBe("-analyzers");
	});

	it("passes every analyzer jar as an absolute path under the unpacked extension", () => {
		withJava(21);

		const jars = sonarlint.launch(root)!.args.slice(5);

		expect(jars).toHaveLength(11);
		expect(jars.every((jar) => jar.startsWith(path.join(root, "analyzers")))).toBe(true);
		expect(jars).toContain(path.join(root, "analyzers", "sonarjs.jar"));
		expect(jars).toContain(path.join(root, "analyzers", "sonarpython.jar"));
	});

	it("refuses to launch when no new enough Java is on the machine", () => {
		withJava(null);

		expect(sonarlint.launch(root)).toBeNull();
	});

	it("says what is missing rather than failing silently", () => {
		withJava(null);

		const requirement = sonarlint.requirement();

		expect(requirement.satisfied).toBe(false);
		expect(requirement.label).toBe("extensions.needs_java");
		expect(requirement.note).toMatch(/Java 21\+/);
		expect(requirement.helpUrl).toContain("adoptium.net");
	});

	it("is satisfied once a Java 21 runtime is there", () => {
		withJava(21);

		expect(sonarlint.requirement()).toEqual({
			satisfied: true,
			label: null,
			note: null,
			helpUrl: null,
		});
	});

	it("covers the languages its analyzers ship for, and nothing it cannot read", () => {
		expect(sonarlint.languageIdFor("Main.java")).toBe("java");
		expect(sonarlint.languageIdFor("app.py")).toBe("python");
		expect(sonarlint.languageIdFor("main.go")).toBe("go");
		expect(sonarlint.languageIdFor("Card.tsx")).toBe("typescriptreact");
		expect(sonarlint.languageIdFor("photo.png")).toBeNull();
	});

	it("points a rule code at its page in Sonar's rule index", () => {
		expect(sonarlint.ruleUrl("typescript:S1764")).toBe(
			"https://rules.sonarsource.com/typescript/RSPEC-1764/",
		);
		expect(sonarlint.ruleUrl("java:S106")).toBe("https://rules.sonarsource.com/java/RSPEC-106/");
	});

	it("keeps telemetry off in the settings it hands the server", () => {
		expect(sonarlint.defaultSettings()).toMatchObject({ disableTelemetry: true });
	});

	// The server spawns this itself, from Java, with none of our environment —
	// so the Electron binary here launches a second copy of the app.
	// Probes real node binaries on disk, one spawn each, so it needs longer than
	// the default budget on a machine running the rest of the suite alongside it.
	it("never offers the Electron binary as the node its analyzers run on", () => {
		expect(sonarlint.initializationOptions(root).clientNodePath).not.toBe(process.execPath);
	}, 20_000);
});
