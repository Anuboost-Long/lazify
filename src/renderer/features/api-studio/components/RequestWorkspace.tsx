import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { getWorkspaceFileRoute } from "@renderer/app/app-routes";
import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";

import { BASE_URL_VARIABLE, resolveVariable } from "@main/api-studio/environment";
import { hostOf } from "@main/api-studio/runner/build-request";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SplitPane } from "@renderer/shared/ui/split/SplitPane";
import { useRequestDraft } from "../hooks/use-request-draft";
import type { SavedRequestStore } from "../hooks/use-saved-requests";
import { useScriptSettings } from "../hooks/use-script-settings";
import type { ApiVariable, SavedExample, SavedRoute } from "../types";
import { RequestDetails, type RequestTab } from "./RequestDetails";
import { RequestHeader } from "./RequestHeader";
import { ExamplePane } from "./ExamplePane";
import { RequestSummary } from "./RequestSummary";
import { RequestTabs } from "./RequestTabs";
import { RequestTabBar, type RequestTabView } from "./RequestTabBar";
import { SelectRouteEmptyState } from "./SelectRouteEmptyState";
import { ResponseHeader } from "./ResponseHeader";
import { RemoteSendModal } from "./RemoteSendModal";
import { RequestStorageModal } from "./RequestStorageModal";
import { ResponsePanel } from "./ResponsePanel";
import { ScriptResults } from "./ScriptResults";

interface RequestWorkspaceProps {
  projectPath: string;
  route: SavedRoute | null;
  store: SavedRequestStore;
  inCollection: boolean;
  readExampleBody: (bodyFile: string) => Promise<string>;
  tabs: RequestTabView[];
  activeTabKey: string | null;
  example: SavedExample | null;
  onActivateTab: (key: string) => void;
  onCloseTab: (key: string) => void;
  onCloseAllTabs: () => void;
  variables: ApiVariable[];
  values: Record<string, string>;
  onOpenEnvironment: () => void;
  onValuesChange: (values: Record<string, string>) => void;
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
  store,
  inCollection,
  readExampleBody,
  tabs,
  activeTabKey,
  example,
  onActivateTab,
  onCloseTab,
  onCloseAllTabs,
  variables,
  values,
  onOpenEnvironment,
  onValuesChange
}: Readonly<RequestWorkspaceProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fileOpensIn, editorCommand } = useInterfaceSettings();
  const [tab, setTab] = useState<RequestTab>("params");
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
    scriptSettings.globalName,
    store
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

  useEffect(() => {
    const saveOnKey = (event: KeyboardEvent) => {
      if (event.key !== "s" || !(event.metaKey || event.ctrlKey)) return;

      event.preventDefault();
      request.save();
    };

    globalThis.addEventListener("keydown", saveOnKey);

    return () => globalThis.removeEventListener("keydown", saveOnKey);
  }, [request.save]);

  const tabBar = (
    <RequestTabBar
      tabs={tabs}
      activeKey={activeTabKey}
      unsaved={request.unsaved}
      onActivate={onActivateTab}
      onClose={onCloseTab}
      onCloseAll={onCloseAllTabs}
    />
  );

  if (example) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {tabBar}
        <ExamplePane
          example={example}
          scriptGlobal={scriptSettings.globalName}
          readBody={readExampleBody}
          onOpenSource={(kept) => openSource(kept.route)}
        />
      </div>
    );
  }

  const requestPane = (
    <section className="flex h-full min-h-0 flex-col">
        {tabBar}

        <RequestHeader
          storageLocation={request.storage.location}
          inCollection={inCollection}
          unsaved={request.unsaved}
          sending={request.sending}
          onSave={request.save}
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

            <RequestTabs
              route={route}
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
                route={route}
                tab={tab}
                fields={request.fields}
                body={request.body}
                scripts={request.scripts}
                scriptGlobal={scriptSettings.globalName}
                known={scriptKnowledge}
                onAddField={request.addField}
                onRepeatField={request.repeatField}
                onRenameField={request.renameField}
                onRemoveField={request.removeField}
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
        onToggle={() => showResponse(false)}
        onSave={request.examples.save}
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
            onToggle={() => showResponse(true)}
            onSave={request.examples.save}
          />
        </>
      )}
      {request.storage.asking && !inCollection ? (
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
