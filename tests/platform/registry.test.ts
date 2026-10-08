import { describe, expect, it, vi } from "vitest";

const get = vi.fn();

vi.mock("@chain/sdk", () => ({ desktop: { http: { get } } }));

const { registryFetch } = await import("@/platform/registry");

const reply = (status: number, data: unknown) => ({ status, ok: status >= 200 && status < 300, data });

describe("registryFetch", () => {
	it("asks Chain for the URL with Lazify's headers and timeout, accepting every status", async () => {
		get.mockResolvedValue(reply(200, { version: "1.0.0" }));

		await expect(
			registryFetch("https://registry.npmjs.org/react/latest", { accept: "application/json", timeoutMs: 10000 }),
		).resolves.toEqual({ version: "1.0.0" });

		const [url, config] = get.mock.lastCall ?? [];
		expect(url).toBe("https://registry.npmjs.org/react/latest");
		expect(config.headers).toEqual({ Accept: "application/json", "User-Agent": "lazify/0.1.0" });
		expect(config.timeout).toBe(10000);
		expect(config.validateStatus(404)).toBe(true);
	});

	it("reads a status outside 200–299 as null", async () => {
		get.mockResolvedValue(reply(404, "Not Found"));

		await expect(registryFetch("https://registry.npmjs.org/missing", { accept: "application/json", timeoutMs: 1 })).resolves.toBeNull();
	});

	it("rejects a body that isn't JSON", async () => {
		get.mockResolvedValue(reply(200, "<html>"));

		await expect(registryFetch("https://registry.npmjs.org/x", { accept: "application/json", timeoutMs: 1 })).rejects.toThrow(
			"Expected JSON from https://registry.npmjs.org/x",
		);
	});

	it("passes Chain's network errors on", async () => {
		const offline = { code: "UNAVAILABLE", message: "offline" };
		get.mockImplementation(async () => {
			throw offline;
		});

		let error: unknown;
		try {
			await registryFetch("https://registry.npmjs.org/x", { accept: "application/json", timeoutMs: 1 });
		} catch (rejection) {
			error = rejection;
		}
		expect(error).toBe(offline);
	});
});
