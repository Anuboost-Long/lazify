import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiRequestDraft, ApiResponseSummary } from "@/shared/lib/api-studio/runner/types";

/** `Worker` doesn't exist under Node — this stands in for one that never replies, to drive the timeout path. */
class NeverRepliesWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: unknown) => void) | null = null;
	postMessage = vi.fn();
	terminate = vi.fn();
	constructor(_url: unknown, _options?: unknown) {}
}

const draft: ApiRequestDraft = {
	method: "GET",
	url: "http://example.test/users",
	headers: [],
	body: null,
};

const response: ApiResponseSummary = {
	status: 200,
	statusText: "OK",
	durationMs: 4,
	headers: [],
	mediaType: "application/json",
	body: "{}",
	bodyBytes: 2,
	truncated: false,
};

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("Worker", NeverRepliesWorker);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("a script that never replies", () => {
	it("gives up on a pre-request script after the timeout", async () => {
		const { runPreRequest } = await import("@/shared/lib/api-studio/scripting/run-scripted");
		const result = runPreRequest("for (;;) {}", draft, {});

		await vi.advanceTimersByTimeAsync(2_000);

		expect((await result).run.error).toContain("did not finish within 2 seconds");
	});

	it("gives up on a post-response script after the timeout", async () => {
		const { runPostResponse } = await import("@/shared/lib/api-studio/scripting/run-scripted");
		const result = runPostResponse("for (;;) {}", draft, response, {});

		await vi.advanceTimersByTimeAsync(2_000);

		expect((await result).run.error).toContain("did not finish within 2 seconds");
	});
});
