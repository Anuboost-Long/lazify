import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

/** Electron's sonarlint provider cases, on Lazify Chain's async provider. */

const java = vi.hoisted(() => ({ runtime: null as { path: string; major: number } | null }));

vi.mock("@/shared/lib/extensions/java-runtime", () => ({
	findJavaRuntime: async () => java.runtime,
	forgetJavaRuntime: () => undefined,
}));
vi.mock("@/shared/lib/environment/node-path", () => ({
	findNodeBinary: async () => "/Users/me/.nvm/versions/node/v20.11.0/bin/node",
}));
vi.mock("@/shared/lib/environment/host", () => ({
	host: { platform: "darwin", arch: "arm64" },
	prepareHost: async () => undefined,
}));

const { sonarlint } = await import("@/shared/lib/extensions/providers/sonarlint");

const root = path.join(os.tmpdir(), "lazify-sonarlint", "unpacked");

const withJava = (major: number | null) => {
	java.runtime = major === null ? null : { path: "/opt/java/bin/java", major };
};

describe("sonarlint provider", async () => {
	it("names the server jar the unpack has to produce", async () => {
		expect(sonarlint.serverMarker).toBe(path.join("server", "sonarlint-ls.jar"));
	});

	it("builds the argv SonarLint's own launcher builds", async () => {
		withJava(21);

		const launch = await sonarlint.launch(root);

		expect(launch?.command).toBe("/opt/java/bin/java");
		expect(launch?.args.slice(0, 4)).toEqual([
			"-Dsonarlint.telemetry.disabled=true",
			"-jar",
			path.join(root, "server", "sonarlint-ls.jar"),
			"-stdio",
		]);
		expect(launch?.args[4]).toBe("-analyzers");
	});

	it("passes every analyzer jar as an absolute path under the unpacked extension", async () => {
		withJava(21);

		const jars = (await sonarlint.launch(root))!.args.slice(5);

		expect(jars).toHaveLength(11);
		expect(jars.every((jar) => jar.startsWith(path.join(root, "analyzers")))).toBe(true);
		expect(jars).toContain(path.join(root, "analyzers", "sonarjs.jar"));
		expect(jars).toContain(path.join(root, "analyzers", "sonarpython.jar"));
	});

	it("refuses to launch when no new enough Java is on the machine", async () => {
		withJava(null);

		expect(await sonarlint.launch(root)).toBeNull();
	});

	it("says what is missing rather than failing silently", async () => {
		withJava(null);

		const requirement = await sonarlint.requirement();

		expect(requirement.satisfied).toBe(false);
		expect(requirement.label).toBe("extensions.needs_java");
		expect(requirement.note).toMatch(/Java 21\+/);
		expect(requirement.helpUrl).toContain("adoptium.net");
	});

	it("is satisfied once a Java 21 runtime is there", async () => {
		withJava(21);

		expect(await sonarlint.requirement()).toEqual({
			satisfied: true,
			label: null,
			note: null,
			helpUrl: null,
		});
	});

	it("covers the languages its analyzers ship for, and nothing it cannot read", async () => {
		expect(sonarlint.languageIdFor("Main.java")).toBe("java");
		expect(sonarlint.languageIdFor("app.py")).toBe("python");
		expect(sonarlint.languageIdFor("main.go")).toBe("go");
		expect(sonarlint.languageIdFor("Card.tsx")).toBe("typescriptreact");
		expect(sonarlint.languageIdFor("photo.png")).toBeNull();
	});

	it("points a rule code at its page in Sonar's rule index", async () => {
		expect(sonarlint.ruleUrl("typescript:S1764")).toBe(
			"https://rules.sonarsource.com/typescript/RSPEC-1764/",
		);
		expect(sonarlint.ruleUrl("java:S106")).toBe("https://rules.sonarsource.com/java/RSPEC-106/");
	});

	it("keeps telemetry off in the settings it hands the server", async () => {
		expect(sonarlint.defaultSettings()).toMatchObject({ disableTelemetry: true });
	});

	// Electron's case kept its own binary out of this field. Here nothing runs
	// inside a Node binary; what matters is that the user's own node is handed over.
	it("hands the server the user's own node for its analyzers", async () => {
		expect((await sonarlint.initializationOptions(root)).clientNodePath).toBe(
			"/Users/me/.nvm/versions/node/v20.11.0/bin/node",
		);
	});
});
