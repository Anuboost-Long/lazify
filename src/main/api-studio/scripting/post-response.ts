import type { ApiRequestDraft, ApiResponseSummary } from "../runner/types";
import { createEnvironmentHandle } from "./environment-handle";
import { createRecorder } from "./recorder";
import { createRequestHandle } from "./request-handle";
import { createResponseHandle } from "./response-handle";
import { runInSandbox } from "./sandbox";
import type { PostResponseResult } from "./types";

export function runPostResponse(
  source: string,
  draft: ApiRequestDraft,
  response: ApiResponseSummary,
  values: Record<string, string>,
  globalName?: string
): PostResponseResult {
  const environment = createEnvironmentHandle(values);
  const recorder = createRecorder();
  const startedAt = Date.now();

  const error = runInSandbox(
    source,
    {
      console: recorder.console,
      lz: {
        request: createRequestHandle(draft, false).handle,
        response: createResponseHandle(response),
        env: environment.handle,
        log: recorder.log,
        test: recorder.test,
        expect: recorder.expect
      }
    },
    globalName
  );

  return {
    run: {
      logs: recorder.logs,
      checks: recorder.checks,
      error,
      durationMs: Date.now() - startedAt
    },
    values: environment.changed
  };
}
