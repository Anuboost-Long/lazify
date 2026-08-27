import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectScanFiles } from "../../../src/main/linting/scan/source-files";

/**
 * A scan reads what the project builds. Everything else on disk — installed
 * packages, build output, a sibling folder nobody ships — has to stay out of it.
 */

let projectPath = "";

const write = (relativePath: string) => {
	const filePath = path.join(projectPath, relativePath);

	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, "export const value = 1;\n");
};

const scanned = () =>
	collectScanFiles(projectPath).files.map((filePath) =>
		path.relative(projectPath, filePath).split(path.sep).join("/"),
	);

beforeEach(() => {
	projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "lazify-scan-files-"));
});

afterEach(() => {
	fs.rmSync(projectPath, { recursive: true, force: true });
});

describe("collectScanFiles", () => {
	it("takes the project's own components and leaves everything else", () => {
		write("src/features/Panel.tsx");
		write("app/routes/Page.jsx");
		write("src/helpers.ts");
		write("node_modules/pkg/Widget.tsx");
		write("dist/Panel.tsx");
		write("scripts/Tool.tsx");

		expect(scanned()).toEqual(["app/routes/Page.jsx", "src/features/Panel.tsx"]);
		expect(collectScanFiles(projectPath).roots).toEqual(["src", "app"]);
	});

	it("walks the project itself when it keeps code somewhere else", () => {
		write("components/Panel.tsx");
		write("node_modules/pkg/Widget.tsx");

		expect(scanned()).toEqual(["components/Panel.tsx"]);
		expect(collectScanFiles(projectPath).roots).toEqual(["."]);
	});
});
