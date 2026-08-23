import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SplitPane } from "@renderer/shared/ui/split/SplitPane";
import type { BodyEditor, ScriptEditor } from "../hooks/use-request-draft";
import type { ExampleRequest, SavedExample } from "../types";
import { RequestDetails, type RequestTab } from "./RequestDetails";
import { RequestSummary } from "./RequestSummary";
import { RequestTabs } from "./RequestTabs";
import { ResponsePanel } from "./ResponsePanel";

interface ExamplePaneProps {
  example: SavedExample;
  scriptGlobal: string;
  readBody: (bodyFile: string) => Promise<string>;
  onOpenSource: (request: ExampleRequest) => void;
}

const NOTHING_TO_CHANGE = () => undefined;

function bodyOf(request: ExampleRequest): BodyEditor {
  return {
    mode: request.mode,
    json: request.json,
    entries: request.entries,
    valid: true,
    setMode: NOTHING_TO_CHANGE,
    setJson: NOTHING_TO_CHANGE,
    setEntries: NOTHING_TO_CHANGE,
    format: NOTHING_TO_CHANGE,
    reset: NOTHING_TO_CHANGE
  };
}

function scriptsOf(request: ExampleRequest): ScriptEditor {
  return {
    pre: request.scripts.pre,
    post: request.scripts.post,
    setPre: NOTHING_TO_CHANGE,
    setPost: NOTHING_TO_CHANGE
  };
}

export function ExamplePane({
  example,
  scriptGlobal,
  readBody,
  onOpenSource
}: Readonly<ExamplePaneProps>) {
  const { t } = useTranslation();
  const [body, setBody] = useState(example.body);
  const [tab, setTab] = useState<RequestTab>("params");
  const request = example.request;

  useEffect(() => {
    setBody(example.body);

    if (example.body || !example.bodyFile) return;

    let cancelled = false;

    void readBody(example.bodyFile)
      .then((text) => {
        if (!cancelled) setBody(text);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [example.id, example.bodyFile]);

  const heading = (
    <div className="flex items-center gap-2 border-b border-border px-4 py-3">
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text">
        {example.name}
      </span>
      <span
        className={clsx(
          "flex shrink-0 items-center gap-1 rounded-md bg-text/[0.06] px-2 py-0.5",
          "text-[10px] font-medium text-muted"
        )}
      >
        <UiIcon name="journal-page" className="h-3 w-3" />
        {t(translation.ApiStudio.ExampleReadOnly)}
      </span>
    </div>
  );

  const requestPane = (
    <section className="flex h-full min-h-0 flex-col">
      {heading}

      {request ? (
        <>
          <RequestSummary
            route={request.route}
            url={request.url}
            baseUrl={request.baseUrl}
            variables={[]}
            values={{}}
            readOnly
            onOpenEnvironment={NOTHING_TO_CHANGE}
            onOpenSource={() => onOpenSource(request)}
          />

          <RequestTabs
            route={request.route}
            scripts={request.scripts}
            active={tab}
            onSelect={setTab}
          />

          <div
            className={clsx(
              "flex min-h-0 flex-1 flex-col px-4 py-3",
              tab === "body" ? "overflow-hidden" : "overflow-y-auto"
            )}
          >
            <RequestDetails
              route={request.route}
              tab={tab}
              fields={request.fields}
              body={bodyOf(request)}
              scripts={scriptsOf(request)}
              scriptGlobal={scriptGlobal}
              known={{ responseBody: null, declaredBody: null, variableNames: [], requestHeaderNames: [], responseHeaderNames: [] }}
              readOnly
              onScriptGlobalChange={NOTHING_TO_CHANGE}
              onFieldChange={NOTHING_TO_CHANGE}
            />
          </div>
        </>
      ) : (
        <p className="px-4 py-4 text-xs leading-5 text-muted">
          {t(translation.ApiStudio.ExampleWithoutRequest)}
        </p>
      )}
    </section>
  );

  return (
    <SplitPane
      className="min-h-0 flex-1"
      direction="vertical"
      storageKey="lazify-api-studio-example-split"
      defaultSize={340}
      minSize={160}
      minOtherSize={120}
      label={t(translation.ApiStudio.ResizeResponse)}
      first={requestPane}
      second={
        <section className="flex h-full min-h-0 flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="text-xs font-semibold text-text">
              {t(translation.ApiStudio.Response)}
            </span>
          </div>

          <ResponsePanel
            outcome={{ ok: true, response: { ...example, body } }}
            restoredAt={example.receivedAt}
            sending={false}
          />
        </section>
      }
    />
  );
}
