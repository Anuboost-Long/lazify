import { describe, expect, it } from "vitest";

import { isLoopbackHost } from "../../../src/main/api-studio/runner/tls-trust";

/**
 * A dev certificate is trusted by adding it to the machine's own store, which
 * Node does not read. Verification is relaxed for the loopback interface only,
 * so this is the line that decides whether a request is checked at all.
 */
describe("isLoopbackHost", () => {
	it("recognises the addresses a dev server actually binds", () => {
		for (const host of [
			"localhost",
			"LOCALHOST",
			"api.localhost",
			"127.0.0.1",
			"127.1.2.3",
			"::1",
			"[::1]",
			"0.0.0.0",
		]) {
			expect(isLoopbackHost(host), host).toBe(true);
		}
	});

	it("keeps everything reachable over a network strict", () => {
		for (const host of [
			"example.com",
			"api.staging.internal",
			"10.0.0.5",
			"192.168.1.10",
			"localhost.example.com",
			"notlocalhost",
			"",
		]) {
			expect(isLoopbackHost(host), host).toBe(false);
		}
	});
});
