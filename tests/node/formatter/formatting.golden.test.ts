import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { build } from "rolldown";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import config from "../../../node/formatter/rolldown.config";
import type { FormatterCall } from "../../../src/shared/lib/formatting/worker-protocol";
import { exercise } from "./formatting.scenarios";

const run = promisify(execFile);
const outside = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-formatter-"));
const bundle = path.join(outside, "formatter.mjs");

beforeAll(async () => {
	await build({ ...config, output: { ...config.output, file: bundle } });
}, 60000);

afterAll(() => fs.rmSync(outside, { recursive: true, force: true }));

async function call<T>(request: FormatterCall): Promise<T> {
	// Run from outside every project, as the app runs it from its own data folder.
	const { stdout } = await run("node", [bundle, JSON.stringify(request)], { cwd: outside, maxBuffer: 16 * 1024 * 1024 });
	return JSON.parse(stdout) as T;
}

describe("formatting golden", () => {
	it("runs the same scenario on real folders", async () => {
		const results = await exercise({
			format: (projectPath, paths, mode, settings) =>
				call({
					command: "format",
					request: { projectPath, paths, mode, organizeImports: settings.organizeImports, defaults: settings.defaults },
				}),
			projectFormatter: (projectPath) => call({ command: "project-formatter", projectPath }),
			sample: (defaults) => call({ command: "sample", defaults }),
		});
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	}, 60000);
});
