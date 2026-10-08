import { describe, expect, it } from "vitest";

import type { RegistryFetch } from "@/shared/lib/package-version-matcher/registry";
import { compareVersions, isPreRelease, satisfies, stripRangePrefix } from "@/shared/lib/package-version-matcher/semver-utils";
import { matchPackageVersions } from "@/shared/lib/package-version-matcher/version-matcher";

import { memoryReader } from "../stack-detection/memory-reader";
import {
	COMPARE_CASES,
	FAKE_REGISTRY,
	NETWORK_ERROR,
	PRE_RELEASE_CASES,
	SATISFIES_CASES,
	VERSION_MATCH_CASES,
} from "./version-matcher.cases";

function fakeRegistry() {
	const requests: string[] = [];
	const registry: RegistryFetch = async (url, { accept }) => {
		requests.push(`${accept} ${url}`);
		const reply = FAKE_REGISTRY[url] ?? 404;
		if (reply === NETWORK_ERROR) throw new Error("network down");

		return reply === 404 ? null : structuredClone(reply);
	};

	return { registry, requests };
}

describe("matchPackageVersions golden", () => {
	for (const { name, packageJson } of VERSION_MATCH_CASES) {
		it(name, async () => {
			const { registry, requests } = fakeRegistry();
			const report = await matchPackageVersions({
				projectPath: "/project",
				project: memoryReader({ "package.json": JSON.stringify(packageJson) }),
				registry,
			});

			expect({ report, requests: requests.sort() }).toMatchSnapshot();
		});
	}
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

describe("matchPackageVersions without a package.json", () => {
	it("rejects, as Electron does", async () => {
		await expect(
			matchPackageVersions({ projectPath: "/project", project: memoryReader({}), registry: fakeRegistry().registry }),
		).rejects.toThrow("No package.json found.");
	});
});
