import { interpolate } from "../runner/interpolate";
import type { ApiRequestDraft } from "../runner/types";
import { createEnvironmentHandle } from "./environment-handle";
import { createRecorder } from "./recorder";
import { createRequestHandle } from "./request-handle";
import { runInSandbox } from "./sandbox";
import type { PreRequestResult } from "./types";

const STOP_PREFIX = "lazify:stop:";

function filled(draft: ApiRequestDraft, values: Record<string, string>): ApiRequestDraft {
  return {
    ...draft,
    url: interpolate(draft.url, [], values),
    headers: draft.headers.map((header) => ({
      name: header.name,
      value: interpolate(header.value, [], values)
    })),
    body: draft.body === null ? null : interpolate(draft.body, [], values)
  };
}

export function runPreRequest(
  source: string,
  draft: ApiRequestDraft,
  values: Record<string, string>,
  globalName?: string
): PreRequestResult {
  const environment = createEnvironmentHandle(values);
  const request = createRequestHandle(draft, true);
  const recorder = createRecorder();
  const startedAt = Date.now();

  const error = runInSandbox(
    source,
    {
      console: recorder.console,
      lz: {
        request: request.handle,
        env: environment.handle,
        log: recorder.log,
        test: recorder.test,
        expect: recorder.expect,
        stop: (reason: unknown) => {
          throw new Error(`${STOP_PREFIX}${reason === undefined ? "" : String(reason)}`);
        }
      }
    },
    globalName
  );

  const stopped = error?.startsWith(STOP_PREFIX) ? error.slice(STOP_PREFIX.length) : null;

  return {
    run: {
      logs: recorder.logs,
      checks: recorder.checks,
      error: stopped === null ? error : null,
      durationMs: Date.now() - startedAt
    },
    draft: filled(request.draft(), environment.values),
    values: environment.changed,
    stopped
  };
}
