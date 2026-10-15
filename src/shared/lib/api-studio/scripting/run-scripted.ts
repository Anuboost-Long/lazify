import type { ApiRequestDraft, ApiResponseSummary } from "../runner/types";
import type { EnvironmentVariableKey } from "./environment-handle";
import type { SandboxRequest, SandboxResult } from "./sandbox-worker";
import type { PostResponseResult, PreRequestResult } from "./types";

const TIMEOUT_MS = 2_000;

function timedOut(startedAt: number): { logs: string[]; checks: []; error: string; durationMs: number } {
	return {
		logs: [],
		checks: [],
		error: `The script did not finish within ${TIMEOUT_MS / 1000} seconds.`,
		durationMs: Date.now() - startedAt,
	};
}

/** A fresh worker per run: cheaper to reason about than reusing one across scripts that might leave timers or state behind. */
function runInWorker(request: SandboxRequest): Promise<SandboxResult | null> {
	return new Promise((resolve) => {
		const worker = new Worker(new URL("./sandbox-worker.ts", import.meta.url), { type: "module" });
		const timer = setTimeout(() => {
			worker.terminate();
			resolve(null);
		}, TIMEOUT_MS);

		const settle = (result: SandboxResult | null) => {
			clearTimeout(timer);
			worker.terminate();
			resolve(result);
		};

		worker.onmessage = (event: MessageEvent<SandboxResult>) => settle(event.data);
		worker.onerror = () => settle(null);
		worker.postMessage(request);
	});
}

export async function runPreRequest(
	source: string,
	draft: ApiRequestDraft,
	values: Record<string, string>,
	globalName?: string,
	variables: EnvironmentVariableKey[] = [],
): Promise<PreRequestResult> {
	const startedAt = Date.now();
	const result = await runInWorker({ kind: "pre", source, draft, values, globalName, variables });

	if (result && "draft" in result) return result;

	return { run: timedOut(startedAt), draft, values: {}, stopped: null };
}

export async function runPostResponse(
	source: string,
	draft: ApiRequestDraft,
	response: ApiResponseSummary,
	values: Record<string, string>,
	globalName?: string,
	variables: EnvironmentVariableKey[] = [],
): Promise<PostResponseResult> {
	const startedAt = Date.now();
	const result = await runInWorker({ kind: "post", source, draft, response, values, globalName, variables });

	if (result && !("draft" in result)) return result;

	return { run: timedOut(startedAt), values: {} };
}
