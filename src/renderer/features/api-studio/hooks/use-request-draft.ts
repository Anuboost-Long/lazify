import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildRequest,
  hostOf,
  isFormMediaType,
  isLocalUrl,
  MULTIPART_MEDIA_TYPE,
  URLENCODED_MEDIA_TYPE
} from "@main/api-studio/runner";
import { entriesFromJson, formattedJson, isValidJson } from "../body-text";
import type {
  ApiRequestDraft,
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
import { useSavedRequests } from "./use-saved-requests";

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
  scriptGlobal: string
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
  const [examples, setExamples] = useState<SavedExample[]>([]);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const requests = useSavedRequests(projectPath);

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
      setExamples(saved?.examples ?? []);
      setViewingId(null);
      setRemoteUrl(null);
      setScriptRuns({ pre: null, post: null });
    }

    seeded.current = route
      ? {
          routeId: route.id,
          snapshot: JSON.stringify({
            mode: seedMode,
            json: seedJson,
            entries: seedEntries,
            fields: seedFields,
            scripts: seedScripts
          })
        }
      : null;
  };

  useEffect(() => {
    const sameRoute = seeded.current?.routeId === route?.id;
    const untouched = !seeded.current || snapshot === seeded.current.snapshot;

    /** A route already open and edited is left alone entirely. */
    if (sameRoute && !untouched) return;

    seed(route ? requests.saved(route.id) : undefined, sameRoute);
  }, [route?.id, variant?.mediaType, declaredBody, requests.loadedAt]);

  const store = (response: SavedResponse | null | undefined, kept = examples) => {
    if (!route) return;

    const existing = requests.saved(route.id);

    requests.persist(route.id, {
      mode,
      json,
      entries,
      fields,
      scripts,
      response: response === undefined ? (existing?.response ?? null) : response,
      examples: kept,
      savedAt: new Date().toISOString()
    });
  };

  /** Postman calls these examples: one response a route is expected to give. */
  const saveExample = () => {
    if (!outcome?.ok || viewingId) return;

    const name = `${outcome.response.status} ${outcome.response.statusText}`.trim();
    const taken = examples.filter((example) => example.name.startsWith(name)).length;
    const kept = [
      ...examples,
      {
        ...outcome.response,
        id: `example-${Date.now()}`,
        name: taken > 0 ? `${name} (${taken + 1})` : name,
        receivedAt: restoredAt ?? new Date().toISOString()
      }
    ];

    setExamples(kept);
    store(undefined, kept);
  };

  const removeExample = (id: string) => {
    const kept = examples.filter((example) => example.id !== id);

    setExamples(kept);
    if (viewingId === id) setViewingId(null);
    store(undefined, kept);
  };

  useEffect(() => {
    if (!route || seeded.current?.routeId !== route.id) return;
    if (snapshot === seeded.current.snapshot && !requests.saved(route.id)) return;

    const timer = setTimeout(() => store(undefined), SAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [projectPath, route?.id, snapshot]);

  const body: RequestBodyInput =
    mode === "json"
      ? { mode: "json", text: json }
      : { mode: "form", mediaType: formMediaType, entries };

  const draft = route ? buildRequest({ route, variables, values, fields, body }) : null;

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

  const viewing = examples.find((example) => example.id === viewingId) ?? null;
  const shown: (SavedResponse | ApiResponseSummary) | null =
    viewing ?? (outcome?.ok ? outcome.response : null);
  const bodyFile: string | undefined =
    shown && !shown.body && "bodyFile" in shown && typeof shown.bodyFile === "string"
      ? shown.bodyFile
      : undefined;

  useEffect(() => {
    if (!projectPath || !bodyFile || bodies[bodyFile] !== undefined) return;

    let cancelled = false;

    void globalThis.lazify
      .readApiResponseBody(projectPath, bodyFile)
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
    outcome: shownOutcome,
    restoredAt: viewing ? viewing.receivedAt : restoredAt,
    examples: {
      saved: examples,
      viewingId,
      canSave: Boolean(outcome?.ok) && !viewingId,
      save: saveExample,
      remove: removeExample,
      view: setViewingId
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
