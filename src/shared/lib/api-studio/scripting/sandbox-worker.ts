import { runPostResponse } from "./post-response";
import { runPreRequest } from "./pre-request";
import type { PostResponseResult, PreRequestResult } from "./types";
import type { ApiRequestDraft, ApiResponseSummary } from "../runner/types";
import type { EnvironmentVariableKey } from "./environment-handle";

export type SandboxRequest =
	| {
			kind: "pre";
			source: string;
			draft: ApiRequestDraft;
			values: Record<string, string>;
			globalName?: string;
			variables?: EnvironmentVariableKey[];
	  }
	| {
			kind: "post";
			source: string;
			draft: ApiRequestDraft;
			response: ApiResponseSummary;
			values: Record<string, string>;
			globalName?: string;
			variables?: EnvironmentVariableKey[];
	  };

export type SandboxResult = PreRequestResult | PostResponseResult;

/**
 * This worker IS the sandbox: a plain `new Function` call (`sandbox.ts`) has
 * no way to interrupt a script that never returns, but `self` running on its
 * own OS thread does — the host (`run-scripted.ts`) terminates it on a
 * timeout, which a script here can't prevent or detect.
 */
self.onmessage = (event: MessageEvent<SandboxRequest>) => {
	const request = event.data;
	const result: SandboxResult =
		request.kind === "pre"
			? runPreRequest(request.source, request.draft, request.values, request.globalName, request.variables)
			: runPostResponse(
					request.source,
					request.draft,
					request.response,
					request.values,
					request.globalName,
					request.variables,
				);

	(self as unknown as Worker).postMessage(result);
};
