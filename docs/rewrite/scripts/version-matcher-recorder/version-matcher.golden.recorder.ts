import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { compareVersions, isPreRelease, satisfies, stripRangePrefix } from "../../../../../lazify/src/brain/package-version-matcher/semver-utils";
import { matchPackageVersions } from "../../../../../lazify/src/brain/package-version-matcher/version-matcher";
import {
	COMPARE_CASES,
	FAKE_REGISTRY,
	NETWORK_ERROR,
	PRE_RELEASE_CASES,
	SATISFIES_CASES,
	VERSION_MATCH_CASES,
} from "../../../../tests/shared/lib/package-version-matcher/version-matcher.cases";

const base = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-version-matcher-"));

afterAll(() => fs.rm(base, { recursive: true, force: true }));
afterEach(() => vi.unstubAllGlobals());

function stubRegistry() {
	const requests: string[] = [];
	vi.stubGlobal("fetch", async (url: string, init: { headers: Record<string, string> }) => {
		requests.push(`${init.headers.Accept} ${url}`);
		const reply = FAKE_REGISTRY[url] ?? 404;
		if (reply === NETWORK_ERROR) throw new TypeError("fetch failed");

		return reply === 404
			? new Response("Not Found", { status: 404 })
			: new Response(JSON.stringify(reply), { status: 200, headers: { "content-type": "application/json" } });
	});

	return requests;
}

describe("matchPackageVersions golden", () => {
	VERSION_MATCH_CASES.forEach(({ name, packageJson }, index) => {
		it(name, async () => {
			const projectPath = path.join(base, String(index));
			await fs.mkdir(projectPath, { recursive: true });
			await fs.writeFile(path.join(projectPath, "package.json"), JSON.stringify(packageJson));
			const requests = stubRegistry();

			const report = await matchPackageVersions({ projectPath });

			expect({ report: { ...report, projectPath: "/project" }, requests: requests.sort() }).toMatchSnapshot();
		});
	});
});

describe("semver-utils golden", () => {
	it("satisfies", () => {
		expect(SATISFIES_CASES.map(([version, range]) => [version, range, satisfies(version, range)])).toMatchSnapshot();
	});

	it("compareVersions", () => {
		expect(COMPARE_CASES.map(([a, b]) => [a, b, Math.sign(compareVersions(a, b))])).toMatchSnapshot();
	});

	it("stripRangePrefix and isPreRelease", () => {
		expect(PRE_RELEASE_CASES.map((version) => [version, stripRangePrefix(version), isPreRelease(version)])).toMatchSnapshot();
	});
});
