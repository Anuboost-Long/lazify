import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-ext-e2e-"));

vi.mock("electron", () => ({ app: { getPath: () => userData } }));

const { installExtension, listExtensions, toggleExtension } =
	await import("../../../src/main/extensions");
const { lintFile } = await import("../../../src/main/linting/lint-file");

const ID = "bradlc.vscode-tailwindcss";

const project = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-tw-project-"));
const source = path.join(project, "src", "Card.tsx");

fs.writeFileSync(path.join(project, "package.json"), '{"name":"probe","dependencies":{}}');
fs.writeFileSync(path.join(project, "app.css"), '@import "tailwindcss";\n');
fs.mkdirSync(path.dirname(source), { recursive: true });

const CARD = `export const Card = () => (
	<div className="bg-gradient-to-t from-black to-transparent" />
);
`;

describe("tailwind extension, installed and run for real", () => {
	it("reports itself as available before anything is installed", async () => {
		const [state] = await listExtensions(true);

		expect(state.entry.id).toBe(ID);
		expect(state.status).toBe("not-installed");
		expect(state.latest?.version).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it("downloads from Open VSX and lands a runnable language server", async () => {
		const states = await installExtension(ID);
		const state = states.find((found) => found.entry.id === ID);

		expect(state?.status).toBe("installed");
		expect(state?.installed?.enabled).toBe(true);

		const server = path.join(
			userData,
			"extensions",
			ID,
			state!.installed!.version,
			"extension",
			"dist",
			"tailwindServer.js",
		);

		expect(fs.existsSync(server)).toBe(true);
	}, 180_000);

	it("underlines the class the Tailwind server objects to", async () => {
		const result = await lintFile(source, CARD);
		const found = result.diagnostics.find((item) => item.source === "tailwindcss");

		expect(found?.code).toBe("suggestCanonicalClasses");
		expect(found?.message).toContain("bg-linear-to-t");
		expect(found?.line).toBe(2);
	}, 120_000);

	it("goes quiet the moment the extension is switched off", async () => {
		await toggleExtension(ID, false);

		const result = await lintFile(source, CARD);

		expect(result.diagnostics.filter((item) => item.source === "tailwindcss")).toEqual([]);
	}, 60_000);
});
