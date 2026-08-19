import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { getWorkspaceFileRoute } from "@renderer/app/app-routes";
import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";

import { BASE_URL_VARIABLE, resolveVariable } from "@main/api-studio/environment";
import { hostOf } from "@main/api-studio/runner";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SplitPane } from "@renderer/shared/ui/split/SplitPane";
import { useRequestDraft } from "../hooks/use-request-draft";
import { useScriptSettings } from "../hooks/use-script-settings";
import type { ApiVariable, SavedRoute } from "../types";
import { RequestDetails, type RequestTab } from "./RequestDetails";
import { RequestHeader } from "./RequestHeader";
import { RequestSummary } from "./RequestSummary";
import { SelectRouteEmptyState } from "./SelectRouteEmptyState";
import { ResponseExamples } from "./ResponseExamples";
import { ResponseHeader } from "./ResponseHeader";
import { RemoteSendModal } from "./RemoteSendModal";
import { RequestStorageModal } from "./RequestStorageModal";
import { ResponsePanel } from "./ResponsePanel";
import { ScriptResults } from "./ScriptResults";

interface RequestWorkspaceProps {
  projectPath: string;
  route: SavedRoute | null;
  variables: ApiVariable[];
  values: Record<string, string>;
  onOpenEnvironment: () => void;
  onValuesChange: (values: Record<string, string>) => void;
}

interface WorkspaceTab {
  id: RequestTab;
  label: string;
  count: number | null;
  marked: boolean;
}

function tabsFor(route: SavedRoute, scripts: { pre: string; post: string }): WorkspaceTab[] {
  return [
    {
      id: "params",
      label: translation.ApiStudio.Params,
      count: route.parameters?.length ?? 0,
      marked: false
    },
    {
      id: "headers",
      label: translation.ApiStudio.Headers,
      count: route.headers.length,
      marked: false
    },
    {
      id: "body",
      label: translation.ApiStudio.Body,
      count: route.requestBody?.variants.length ?? 0,
      marked: false
    },
    {
      id: "scripts",
      label: translation.ApiStudio.Scripts,
      count: null,
      marked: Boolean(scripts.pre.trim() || scripts.post.trim())
    },
    {
      id: "responses",
      label: translation.ApiStudio.Responses,
      count: route.responses?.length ?? 0,
      marked: false
    }
  ];
}

function declaredResponseBody(route: SavedRoute | null): string | null {
  const declared = (route?.responses ?? []).filter((response) => response.example);

  return (
    declared.find((response) => response.status.startsWith("2"))?.example ??
    declared[0]?.example ??
    null
  );
}

const CONVENTIONAL_HEADERS = ["Authorization", "Accept", "Content-Type", "X-Request-Id"];

function requestHeaderNames(route: SavedRoute | null): string[] {
  return [
    ...(route?.headers ?? []).map((header) => header.name),
    ...(route?.security ?? [])
      .filter((security) => security.location === "header")
      .map((security) => security.parameterName),
    ...CONVENTIONAL_HEADERS
  ];
}

const RESPONSE_OPEN_KEY = "lazify-api-studio-response-open";

export function RequestWorkspace({
  projectPath,
  route,
  variables,
  values,
  onOpenEnvironment,
  onValuesChange
}: Readonly<RequestWorkspaceProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fileOpensIn, editorCommand } = useInterfaceSettings();
  const [tab, setTab] = useState<RequestTab>("params");
  const [exporting, setExporting] = useState(false);
  const [responseOpen, setResponseOpen] = useState(
    () => globalThis.localStorage?.getItem(RESPONSE_OPEN_KEY) !== "false"
  );
  const scriptSettings = useScriptSettings(projectPath);
  const request = useRequestDraft(
    projectPath,
    route,
    variables,
    values,
    onValuesChange,
    scriptSettings.globalName
  );
  const baseUrl = (resolveVariable(variables, values, BASE_URL_VARIABLE) ?? "").replace(/\/+$/, "");
  const scriptKnowledge = useMemo(
    () => ({
      responseBody: request.outcome?.ok ? request.outcome.response.body : null,
      declaredBody: declaredResponseBody(route),
      variableNames: [...variables.map((variable) => variable.name), ...Object.keys(values)],
      requestHeaderNames: requestHeaderNames(route),
      responseHeaderNames: request.outcome?.ok
        ? request.outcome.response.headers.map((header) => header.name)
        : []
    }),
    [request.outcome, route, variables, values]
  );

  const exportCollection = () => {
    setExporting(true);

    void globalThis.lazify
      .exportPostmanCollection(projectPath)
      .catch(() => null)
      .finally(() => setExporting(false));
  };

  const showResponse = (open: boolean) => {
    globalThis.localStorage?.setItem(RESPONSE_OPEN_KEY, String(open));
    setResponseOpen(open);
  };

  useEffect(() => {
    if (request.arrivedAt) showResponse(true);
  }, [request.arrivedAt]);

  const openSource = (open: SavedRoute) => {
    const filePath = open.source.filePath;
    if (!filePath) return;

    if (fileOpensIn === "app") {
      navigate(getWorkspaceFileRoute(projectPath, filePath, open.source.line));
      return;
    }

    void globalThis.lazify.openInEditor({
      projectPath,
      filePath: `${projectPath}/${filePath}`,
      line: open.source.line,
      command: editorCommand
    });
  };

  const requestPane = (
    <section className="flex h-full min-h-0 flex-col">
        <RequestHeader
          storageLocation={request.storage.location}
          sending={request.sending}
          sendable={Boolean(route && baseUrl)}
          hasBaseUrl={Boolean(baseUrl)}
          onOpenStorage={request.storage.ask}
          onSend={request.send}
        />

        {route && request.draft ? (
          <>
            <RequestSummary
              route={route}
              url={request.draft.url}
              baseUrl={baseUrl}
              variables={variables}
              values={values}
              onOpenEnvironment={onOpenEnvironment}
              onOpenSource={() => openSource(route)}
            />

            <div className="flex border-b border-border px-4">
              {tabsFor(route, request.scripts).map((requestTab) => (
                <button
                  key={requestTab.id}
                  type="button"
                  onClick={() => setTab(requestTab.id)}
                  className={clsx(
                    "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium",
                    "transition-colors",
                    tab === requestTab.id
                      ? "border-accent text-text"
                      : "border-transparent text-muted hover:text-text"
                  )}
                >
                  {t(requestTab.label)}
                  {requestTab.count ? (
                    <span className="rounded-full bg-text/[0.06] px-1.5 text-[10px] text-muted">
                      {requestTab.count}
                    </span>
                  ) : null}
                  {requestTab.marked ? (
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <RequestDetails
                route={route}
                tab={tab}
                fields={request.fields}
                body={request.body}
                scripts={request.scripts}
                scriptGlobal={scriptSettings.globalName}
                known={scriptKnowledge}
                onScriptGlobalChange={scriptSettings.setGlobalName}
                onFieldChange={request.setField}
              />
            </div>
          </>
        ) : (
          <SelectRouteEmptyState />
        )}
      </section>
  );

  const responsePane = (
    <section className="flex h-full min-h-0 flex-col">
      <ResponseHeader
        open
        canSave={request.examples.canSave}
        canExport={Boolean(projectPath)}
        exporting={exporting}
        onToggle={() => showResponse(false)}
        onSave={request.examples.save}
        onExport={exportCollection}
      />
      <ResponseExamples
        examples={request.examples.saved}
        viewingId={request.examples.viewingId}
        onView={request.examples.view}
        onRemove={request.examples.remove}
      />
      <ScriptResults pre={request.scriptRuns.pre} post={request.scriptRuns.post} />
      <ResponsePanel
        outcome={request.outcome}
        restoredAt={request.restoredAt}
        sending={request.sending}
      />
    </section>
  );

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      {responseOpen ? (
        <SplitPane
          className="min-h-0 flex-1"
          direction="vertical"
          storageKey="lazify-api-studio-response-split"
          defaultSize={340}
          minSize={160}
          minOtherSize={120}
          label={t(translation.ApiStudio.ResizeResponse)}
          first={requestPane}
          second={responsePane}
        />
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col">{requestPane}</div>
          <ResponseHeader
            open={false}
            canSave={request.examples.canSave}
            canExport={Boolean(projectPath)}
            exporting={exporting}
            onToggle={() => showResponse(true)}
            onSave={request.examples.save}
            onExport={exportCollection}
          />
        </>
      )}
      {request.storage.asking ? (
        <RequestStorageModal
          open
          location={request.storage.location}
          onChoose={request.storage.choose}
          onClose={request.storage.dismiss}
        />
      ) : null}

      <RemoteSendModal
        open={Boolean(request.remoteUrl)}
        host={hostOf(request.remoteUrl ?? "") ?? ""}
        onSendOnce={request.confirmRemote}
        onAlwaysAllow={request.alwaysAllowRemote}
        onCancel={request.cancelRemote}
      />
    </main>
  );
}
