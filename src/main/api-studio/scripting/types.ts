import type { ApiRequestDraft, ApiResponseSummary } from "../runner/types";

export interface RouteScripts {
  pre: string;
  post: string;
}

export interface ScriptCheck {
  name: string;
  passed: boolean;
  detail: string | null;
}

export interface ScriptRun {
  logs: string[];
  checks: ScriptCheck[];
  error: string | null;
  durationMs: number;
}

export interface PreRequestResult {
  run: ScriptRun;
  draft: ApiRequestDraft;
  values: Record<string, string>;
  stopped: string | null;
}

export interface PostResponseResult {
  run: ScriptRun;
  values: Record<string, string>;
}

export interface ScriptedRunInput {
  draft: ApiRequestDraft;
  scripts: RouteScripts;
  values: Record<string, string>;
  globalName?: string;
}

export interface ApiRunOutcome {
  outcome:
    | { ok: true; response: ApiResponseSummary }
    | { ok: false; error: string; durationMs: number };
  pre: ScriptRun | null;
  post: ScriptRun | null;
  changedValues: Record<string, string> | null;
}

export const EMPTY_SCRIPTS: RouteScripts = { pre: "", post: "" };
