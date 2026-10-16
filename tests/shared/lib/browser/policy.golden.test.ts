import { describe, expect, it } from "vitest";

import { isCrossSite, siteOf } from "@/shared/lib/browser/popup-policy";
import { isLoopbackUrl } from "@/shared/lib/browser/preview-guard";

import { runPolicyCases } from "./policy.cases";

describe("browser policy golden", () => {
	it("tells sites apart, and loopback from the web, as Electron does", () => {
		expect(runPolicyCases({ siteOf, isCrossSite, isLoopbackUrl })).toMatchSnapshot();
	});
});
