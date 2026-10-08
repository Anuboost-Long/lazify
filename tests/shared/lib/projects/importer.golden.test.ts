import { describe, expect, it, vi } from "vitest";

import { nodeFolders } from "../../../platform/node-folders";

import { exercise } from "./importer.scenarios";

vi.mock("@chain/sdk", () => ({ desktop: { folders: nodeFolders } }));

const api = {
	...(await import("@/shared/lib/projects/project-importer-optimized")),
	...(await import("@/shared/lib/projects/project-importer")),
	importProjectIndexFromDirectory: (await import("@/platform/projects")).importProjectIndexFromDirectory,
};

describe("project importer golden", () => {
	it("imports the same project", async () => {
		const results = await exercise(api);
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	});
});
