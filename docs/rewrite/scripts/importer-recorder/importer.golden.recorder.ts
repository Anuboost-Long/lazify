import { describe, expect, it } from "vitest";

import { exercise } from "../../../../tests/shared/lib/projects/importer.scenarios";

const api = {
	...(await import("../../../../../lazify/src/main/projects/project-importer-optimized")),
	...(await import("../../../../../lazify/src/main/projects/project-importer")),
};

describe("project importer golden", () => {
	it("imports the same project", async () => {
		const results = await exercise(api);
		for (const [name, value] of Object.entries(results)) {
			expect(value).toMatchSnapshot(name);
		}
	});
});
