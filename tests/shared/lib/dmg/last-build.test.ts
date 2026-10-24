// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";

import { readLastDmgBuild, rememberDmgBuild } from "@/shared/lib/dmg/last-build";

afterEach(() => globalThis.localStorage.clear());

describe("last DMG build", () => {
	it("reads back the build it remembered", () => {
		rememberDmgBuild({ appName: "Lazify", builtAt: "2026-10-24T09:00:00.000Z" });

		expect(readLastDmgBuild()).toEqual({ appName: "Lazify", builtAt: "2026-10-24T09:00:00.000Z" });
	});

	it("reads nothing before a build, or from a damaged record", () => {
		expect(readLastDmgBuild()).toBeNull();

		globalThis.localStorage.setItem("lazify-dmg-last-build", "{not json");
		expect(readLastDmgBuild()).toBeNull();

		globalThis.localStorage.setItem("lazify-dmg-last-build", JSON.stringify({ appName: 3 }));
		expect(readLastDmgBuild()).toBeNull();
	});
});
