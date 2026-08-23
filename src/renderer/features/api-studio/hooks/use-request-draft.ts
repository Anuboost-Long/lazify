import { useEffect, useMemo, useRef, useState } from "react";

import { BASE_URL_VARIABLE, resolveVariable } from "@main/api-studio/environment";
import { buildRequest, hostOf, isLocalUrl, repeatKey } from "@main/api-studio/runner/build-request";
import {
  isFormMediaType,
  MULTIPART_MEDIA_TYPE,
  URLENCODED_MEDIA_TYPE
} from "@main/api-studio/runner/encode-body";
import { entriesFromJson, formattedJson, isValidJson } from "../body-text";
import type {
  ApiRequestDraft,
  ExampleRequest,
  ApiResponseSummary,
  ApiSendOutcome,
  ApiVariable,
  BodyMode,
  FormEntry,
  RequestBodyInput,
  RouteScripts,
  SavedExample,
  SavedRequest,
  SavedResponse,
  SavedRoute,
  ScriptRun
} from "../types";
import type { SavedRequestStore } from "./use-saved-requests";

const SAVE_DELAY_MS = 500;
const NO_SCRIPTS: RouteScripts = { pre: "", post: "" };

export interface ScriptEditor {
  pre: string;
  post: string;
  setPre: (text: string) => void;
  setPost: (text: string) => void;
}

export interface BodyEditor {
  mode: BodyMode;
  json: string;
  entries: FormEntry[];
  valid: boolean;
  setMode: (mode: BodyMode) => void;
  setJson: (text: string) => void;
  setEntries: (entries: FormEntry[]) => void;
  format: () => void;
  reset: () => void;
}

export function useRequestDraft(
  projectPath: string,
  route: SavedRoute | null,
  variables: ApiVariable[],
  values: Record<string, string>,
  onValuesChange: (values: Record<string, string>) => void,
  scriptGlobal: string,
  requests: SavedRequestStore
) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<BodyMode>("json");
  const [json, setJson] = useState("");
  const [entries, setEntries] = useState<FormEntry[]>([]);
  const [scripts, setScripts] = useState<RouteScripts>(NO_SCRIPTS);
  const [scriptRuns, setScriptRuns] = useState<{ pre: ScriptRun | null; post: ScriptRun | null }>({
    pre: null,
    post: null
  });
  const [outcome, setOutcome] = useState<ApiSendOutcome | null>(null);
  const [arrivedAt, setArrivedAt] = useState(0);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [allowedHosts, setAllowedHosts] = useState<string[]>([]);
  const [sent, setSent] = useState<ExampleRequest | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const pendingSave = useRef<(() => void) | null>(null);

  useEffect(() => {
    setAllowedHosts([]);

    if (!projectPath) return;

    let cancelled = false;

    void globalThis.lazify
      .readAllowedHosts(projectPath)
      .then((hosts) => {
        if (!cancelled) setAllowedHosts(hosts);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [projectPath]);
  const seeded = useRef<{ routeId: string; snapshot: string } | null>(null);
  /** Bodies live in files: one is read when something is about to show it. */
  const [bodies, setBodies] = useState<Record<string, string>>({});

  const variant = route?.requestBody?.variants[0] ?? null;
  const declaredBody = variant?.example ?? variant?.defaultBody ?? "";
  const declaredMode: BodyMode = isFormMediaType(variant?.mediaType) ? "form" : "json";
  /** A file cannot be url-encoded: attaching one settles what the body is. */
  const formMediaType = entries.some((entry) => entry.kind === "file")
    ? MULTIPART_MEDIA_TYPE
    : isFormMediaType(variant?.mediaType)
      ? variant!.mediaType
      : URLENCODED_MEDIA_TYPE;
  const snapshot = JSON.stringify({ mode, json, entries, fields, scripts });

  /**
   * Seeding a route the second time is not opening a new one: its details
   * arrive after it is shown, and what the reader is looking at stays put.
   */
  const seed = (saved: SavedRequest | undefined, keepView = false) => {
    const seedJson = saved?.json ?? formattedJson(declaredBody);
    const seedEntries = saved?.entries ?? entriesFromJson(declaredBody);
    const seedMode = saved?.mode ?? declaredMode;
    const seedFields = saved?.fields ?? {};
    const seedScripts = saved?.scripts ?? NO_SCRIPTS;

    setMode(seedMode);
    setJson(seedJson);
    setEntries(seedEntries);
    setFields(seedFields);
    setScripts(seedScripts);
    if (!keepView) {
      setOutcome(saved?.response ? { ok: true, response: saved.response } : null);
      setRestoredAt(saved?.response?.receivedAt ?? null);
      setSent(null);
      setRemoteUrl(null);
      setScriptRuns({ pre: null, post: null });
    }

    const seedSnapshot = JSON.stringify({
      mode: seedMode,
      json: seedJson,
      entries: seedEntries,
      fields: seedFields,
      scripts: seedScripts
    });

    setSavedSnapshot(seedSnapshot);
    seeded.current = route ? { routeId: route.id, snapshot: seedSnapshot } : null;
  };

  useEffect(() => {
    const sameRoute = seeded.current?.routeId === route?.id;
    const untouched = !seeded.current || snapshot === seeded.current.snapshot;

    /** A route already open and edited is left alone entirely. */
    if (sameRoute && !untouched) return;

    seed(route ? requests.saved(route.id) : undefined, sameRoute);
  }, [route?.id, variant?.mediaType, declaredBody, requests.loadedAt]);

  const store = (response: SavedResponse | null | undefined, kept?: SavedExample[]) => {
    if (!route) return;

    const existing = requests.saved(route.id);

    setSavedSnapshot(snapshot);
    requests.persist(route.id, {
      mode,
      json,
      entries,
      fields,
      scripts,
      response: response === undefined ? (existing?.response ?? null) : response,
      examples: kept ?? existing?.examples ?? [],
      savedAt: new Date().toISOString()
    });
  };

  const saveExample = () => {
    if (!outcome?.ok || !route) return;

    const held = requests.saved(route.id)?.examples ?? [];
    const name = `${outcome.response.status} ${outcome.response.statusText}`.trim();
    const taken = held.filter((example) => example.name.startsWith(name)).length;

    store(undefined, [
      ...held,
      {
        ...outcome.response,
        id: `example-${Date.now()}`,
        name: taken > 0 ? `${name} (${taken + 1})` : name,
        request: sent ?? (draft ? exampleRequest(draft) : null),
        receivedAt: restoredAt ?? new Date().toISOString()
      }
    ]);
  };

  const save = () => {
    pendingSave.current = null;
    store(undefined);
  };

  useEffect(() => {
    if (!route || seeded.current?.routeId !== route.id) return;
    if (snapshot === seeded.current.snapshot && !requests.saved(route.id)) return;
    if (snapshot === savedSnapshot) return;

    pendingSave.current = save;

    const timer = setTimeout(save, SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [projectPath, route?.id, snapshot]);

  useEffect(() => () => pendingSave.current?.(), [route?.id]);

  const body: RequestBodyInput =
    mode === "json"
      ? { mode: "json", text: json }
      : { mode: "form", mediaType: formMediaType, entries };

  const draft = route ? buildRequest({ route, variables, values, fields, body }) : null;
  const baseUrl = (resolveVariable(variables, values, BASE_URL_VARIABLE) ?? "").replace(/\/+$/, "");

  const exampleRequest = (target: ApiRequestDraft): ExampleRequest | null =>
    route
      ? { ...target, route, baseUrl, fields, mode, json, entries, scripts }
      : null;

  const run = async (target: ApiRequestDraft) => {
    setSending(true);

    try {
      const result = await globalThis.lazify.runApiRequest({
        draft: target,
        scripts,
        values,
        globalName: scriptGlobal
      });

      setScriptRuns({ pre: result.pre, post: result.post });
      setSent(exampleRequest(target));
      setOutcome(result.outcome);
      setArrivedAt(Date.now());
      setRestoredAt(null);
      if (result.changedValues) onValuesChange({ ...values, ...result.changedValues });
      store(
        result.outcome.ok
          ? { ...result.outcome.response, receivedAt: new Date().toISOString() }
          : null
      );
    } catch (error) {
      setScriptRuns({ pre: null, post: null });
      setOutcome({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: 0
      });
      setArrivedAt(Date.now());
    } finally {
      setSending(false);
    }
  };

  const send = () => {
    if (!draft || sending) return;

    const host = hostOf(draft.url);

    if (isLocalUrl(draft.url) || (host && allowedHosts.includes(host))) {
      void run(draft);
      return;
    }

    setRemoteUrl(draft.url);
  };

  const shown: (SavedResponse | ApiResponseSummary) | null = outcome?.ok
    ? outcome.response
    : null;
  const bodyFile: string | undefined =
    shown && !shown.body && "bodyFile" in shown && typeof shown.bodyFile === "string"
      ? shown.bodyFile
      : undefined;

  useEffect(() => {
    if (!projectPath || !bodyFile || bodies[bodyFile] !== undefined) return;

    let cancelled = false;

    void requests
      .readBody(bodyFile)
      .then((text) => {
        if (!cancelled) setBodies((current) => ({ ...current, [bodyFile]: text }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [projectPath, bodyFile]);

  const shownResponse = useMemo(
    () => (shown && bodyFile ? { ...shown, body: bodies[bodyFile] ?? "" } : shown),
    [shown, bodyFile, bodies]
  );
  const shownOutcome = useMemo(
    () => (shownResponse ? { ok: true as const, response: shownResponse } : outcome),
    [shownResponse, outcome]
  );

  return {
    fields,
    draft,
    arrivedAt,
    unsaved: Boolean(route) && savedSnapshot !== null && snapshot !== savedSnapshot,
    save,
    outcome: shownOutcome,
    restoredAt,
    examples: {
      canSave: Boolean(outcome?.ok),
      save: saveExample
    },
    sending,
    remoteUrl,
    storage: {
      location: requests.location,
      asking: requests.asking,
      choose: requests.choose,
      ask: requests.ask,
      dismiss: requests.dismiss
    },
    body: {
      mode,
      json,
      entries,
      valid: isValidJson(json),
      setMode,
      setJson,
      setEntries,
      format: () => setJson(formattedJson(json)),
      reset: () => {
        if (route) requests.forget(route.id);
        seed(undefined);
        setScripts(scripts);
      }
    } satisfies BodyEditor,
    scripts: {
      pre: scripts.pre,
      post: scripts.post,
      setPre: (text: string) => setScripts((current) => ({ ...current, pre: text })),
      setPost: (text: string) => setScripts((current) => ({ ...current, post: text }))
    } satisfies ScriptEditor,
    scriptRuns,
    setField: (key: string, value: string) =>
      setFields((current) => ({ ...current, [key]: value })),
    addField: (location: "query" | "header") => {
      const taken = new Set(Object.keys(fields));

      for (let index = 1; ; index += 1) {
        const key = `${location}:${location === "header" ? "X-Header" : "param"}${index}`;

        if (taken.has(key)) continue;

        setFields((current) => ({ ...current, [key]: "" }));

        return key;
      }
    },
    repeatField: (key: string) => {
      const next = repeatKey(key, Object.keys(fields));

      setFields((current) => ({ ...current, [next]: "" }));

      return next;
    },
    renameField: (key: string, name: string) => {
      const location = key.slice(0, key.indexOf(":"));
      const renamed = `${location}:${name.trim()}`;

      if (!name.trim() || renamed === key || fields[renamed] !== undefined) return;

      setFields((current) => {
        const { [key]: carried, ...rest } = current;

        return { ...rest, [renamed]: carried ?? "" };
      });
    },
    removeField: (key: string) =>
      setFields((current) => {
        const { [key]: dropped, ...rest } = current;

        return rest;
      }),
    send,
    confirmRemote: () => {
      setRemoteUrl(null);
      if (draft) void run(draft);
    },
    alwaysAllowRemote: () => {
      const target = remoteUrl;

      setRemoteUrl(null);
      if (!target) return;

      const host = hostOf(target);

      if (host) setAllowedHosts((current) => [...current, host]);
      if (projectPath) {
        void globalThis.lazify
          .allowApiHost(projectPath, target)
          .then(setAllowedHosts)
          .catch(() => undefined);
      }

      if (draft) void run(draft);
    },
    cancelRemote: () => setRemoteUrl(null)
  };
}
