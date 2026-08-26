import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-sonarlint-e2e-"));

vi.mock("electron", () => ({ app: { getPath: () => userData } }));

const { findJavaRuntime, installExtension, listExtensions, writeProjectExtensionManifest } =
	await import("../../../src/main/extensions");
const { lintFile } = await import("../../../src/main/linting/lint-file");

const ID = "SonarSource.sonarlint-vscode";

const project = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-sonar-project-"));
const source = path.join(project, "src", "cart.ts");

fs.writeFileSync(path.join(project, "package.json"), '{"name":"probe"}');
fs.mkdirSync(path.dirname(source), { recursive: true });

const SMELLY = `export function pick(a: number, b: number): number {
  if (a > 1 && a > 1) return 0;
  return b;
}
`;

describe("sonarlint extension, installed from Open VSX", () => {
	it("resolves a release and reports its licence", async () => {
		const state = (await listExtensions(true)).find((found) => found.entry.id === ID);

		expect(state?.latest?.version).toMatch(/^\d+\.\d+\.\d+$/);
		expect(state?.entry.displayName).toBe("SonarQube for IDE");
	});

	it("downloads the analyzer bundle and lands the server jar", async () => {
		const state = (await installExtension(ID)).find((found) => found.entry.id === ID);

		expect(state?.status).toBe("installed");

		const jar = path.join(
			userData,
			"extensions",
			ID,
			state!.installed!.version,
			"extension",
			"server",
			"sonarlint-ls.jar",
		);

		expect(fs.existsSync(jar)).toBe(true);
		expect(fs.statSync(jar).size).toBeGreaterThan(10_000_000);
	}, 900_000);

	it("either analyses the file or stays silent because Java 21 is missing", async () => {
		const java = findJavaRuntime(21, true);
		const result = await lintFile(source, SMELLY);
		const found = result.diagnostics.filter((item) => item.source === "sonarlint");

		if (java) {
			expect(found.length).toBeGreaterThan(0);
			expect(found.some((item) => item.code?.includes("S1764"))).toBe(true);
		} else {
			expect(found).toEqual([]);
		}
	}, 300_000);

	it("tells an agent, in the manifest, exactly why it is not running", async () => {
		await writeProjectExtensionManifest(project);

		const manifest = JSON.parse(
			fs.readFileSync(path.join(project, ".lazify", "extensions.json"), "utf8"),
		);

		console.log(JSON.stringify(manifest, null, 2));

		const sonar = manifest.engines.find(
			(engine: { source: string }) => engine.source === "sonarlint",
		);

		expect(sonar.version).toEqual(expect.stringMatching(/^\d+\.\d+\.\d+$/));

		if (findJavaRuntime(21)) expect(sonar.enabled).toBe(true);
		else {
			expect(sonar.enabled).toBe(false);
			expect(sonar.requirement).toMatch(/Java 21\+/);
		}
	});
});
