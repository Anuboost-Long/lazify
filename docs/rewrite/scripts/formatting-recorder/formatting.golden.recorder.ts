import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

import { exercise } from "../../../../tests/node/formatter/formatting.scenarios";

const userData = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-user-data-"));

afterAll(() => fs.rmSync(userData, { recursive: true, force: true }));

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => userData };
	return { app, default: { app } };
});

const { formatChangedFiles, formatSample, readProjectFormatter } = await import(
	"../../../../../lazify/src/main/formatting"
);

describe("formatting golden", () => {
	it("runs the same scenario on real folders", async () => {
		const results = await exercise({
			format: (projectPath, paths, mode, settings) => {
				fs.writeFileSync(path.join(userData, "code-formatter.json"), JSON.stringify(settings));
				return formatChangedFiles(projectPath, paths, mode);
			},
			projectFormatter: readProjectFormatter,
			sample: formatSample,
		});
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	}, 60000);
});
