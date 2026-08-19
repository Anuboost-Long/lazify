import { runPostResponse, runPreRequest } from "../scripting";
import type { ApiRunOutcome, ScriptedRunInput } from "../scripting";
import { sendApiRequest } from "./send-request";

function stopMessage(reason: string): string {
  return reason.trim()
    ? `The pre-request script stopped this request: ${reason.trim()}`
    : "The pre-request script stopped this request.";
}

export async function runApiRequest(input: ScriptedRunInput): Promise<ApiRunOutcome> {
  const pre = input.scripts.pre.trim()
    ? runPreRequest(input.scripts.pre, input.draft, input.values, input.globalName)
    : null;

  if (pre && (pre.stopped !== null || pre.run.error)) {
    return {
      outcome: {
        ok: false,
        error: pre.run.error ?? stopMessage(pre.stopped ?? ""),
        durationMs: pre.run.durationMs
      },
      pre: pre.run,
      post: null,
      changedValues: Object.keys(pre.values).length > 0 ? pre.values : null
    };
  }

  const outcome = await sendApiRequest(pre?.draft ?? input.draft);
  const post =
    outcome.ok && input.scripts.post.trim()
      ? runPostResponse(
          input.scripts.post,
          pre?.draft ?? input.draft,
          outcome.response,
          { ...input.values, ...(pre?.values ?? {}) },
          input.globalName
        )
      : null;

  const changedValues = { ...(pre?.values ?? {}), ...(post?.values ?? {}) };

  return {
    outcome,
    pre: pre?.run ?? null,
    post: post?.run ?? null,
    changedValues: Object.keys(changedValues).length > 0 ? changedValues : null
  };
}
