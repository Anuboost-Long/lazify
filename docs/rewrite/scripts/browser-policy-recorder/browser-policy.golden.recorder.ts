import { describe, expect, it, vi } from "vitest";

import { runPolicyCases } from "../../../../tests/shared/lib/browser/policy.cases";

vi.mock("../../../../../lazify/node_modules/electron/index.js", () => {
	const app = { getPath: () => "/nowhere", on: () => undefined };
	const session = { fromPartition: () => ({}) };
	const shell = { openExternal: async () => undefined };
	return { app, session, shell, default: { app, session, shell } };
});

const { isCrossSite, siteOf } = await import("../../../../../lazify/src/main/browser/popup-policy");
const { isLoopbackUrl } = await import("../../../../../lazify/src/main/browser/preview-guard");

describe("browser policy golden", () => {
	it("tells sites apart, and loopback from the web, as Electron does", () => {
		expect(runPolicyCases({ siteOf, isCrossSite, isLoopbackUrl })).toMatchSnapshot();
	});
});
