import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { requestUrlFor, resolveVariable, variablesForRoute } from "@main/api-studio/environment";
import type { ApiVariable, SavedRoute } from "../types";
import { MethodBadge } from "./MethodBadge";
import { RequestDetails, type RequestTab } from "./RequestDetails";
import { RouteNeedsRow } from "./RouteNeedsRow";

interface RequestWorkspaceProps {
  route: SavedRoute | null;
  variables: ApiVariable[];
  values: Record<string, string>;
  onOpenEnvironment: () => void;
}

function tabsFor(route: SavedRoute): Array<{ id: RequestTab; label: string; count: number | null }> {
  return [
    { id: "params", label: translation.ApiStudio.Params, count: route.parameters?.length ?? 0 },
    { id: "headers", label: translation.ApiStudio.Headers, count: route.headers.length },
    {
      id: "body",
      label: translation.ApiStudio.Body,
      count: route.requestBody?.variants.length ?? 0
    },
    { id: "responses", label: translation.ApiStudio.Responses, count: route.responses?.length ?? 0 }
  ];
}

function sourceLabel(route: SavedRoute) {
  const { filePath, line } = route.source;
  if (!filePath) return null;
  return line ? `${filePath}:${line}` : filePath;
}

export function RequestWorkspace({
  route,
  variables,
  values,
  onOpenEnvironment
}: Readonly<RequestWorkspaceProps>) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<RequestTab>("params");

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <section className="flex min-h-[280px] flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <span className="text-xs font-semibold text-text">
            {t(translation.ApiStudio.Request)}
          </span>
          <button
            type="button"
            disabled
            title={t(translation.ApiStudio.SendPending)}
            className={clsx(
              "flex h-7 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-bg",
              "disabled:cursor-not-allowed disabled:opacity-35"
            )}
          >
            <UiIcon name="play" className="h-3.5 w-3.5" />
            {t(translation.ApiStudio.Send)}
          </button>
        </div>

        {route ? (
          <>
            <div className="flex flex-col gap-1.5 border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <MethodBadge method={route.method} />
                <p className="min-w-0 flex-1 truncate font-mono text-xs text-text">
                  <span className="text-muted">
                    {requestUrlFor(route, variables, values).slice(0, -route.path.length)}
                  </span>
                  {route.path}
                </p>
              </div>

              <RouteNeedsRow
                names={variablesForRoute(route)}
                unset={variablesForRoute(route).filter(
                  (name) => !resolveVariable(variables, values, name)
                )}
                onOpenEnvironment={onOpenEnvironment}
              />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {route.summary ? (
                  <span className="text-[11px] leading-4 text-muted">{route.summary}</span>
                ) : null}
                {sourceLabel(route) ? (
                  <span
                    title={t(translation.ApiStudio.Source)}
                    className="flex items-center gap-1 font-mono text-[10px] text-muted"
                  >
                    <UiIcon name="page" className="h-3 w-3" />
                    {sourceLabel(route)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex border-b border-border px-4">
              {tabsFor(route).map((requestTab) => (
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
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <RequestDetails route={route} tab={tab} />
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
            <div className="max-w-sm">
              <span
                className={clsx(
                  "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl",
                  "bg-accent/[0.08] text-accent"
                )}
              >
                <UiIcon name="globe" className="h-6 w-6" />
              </span>
              <p className="mt-4 text-base font-semibold text-text">
                {t(translation.ApiStudio.SelectRouteTitle)}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-muted">
                {t(translation.ApiStudio.SelectRouteDescription)}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="flex min-h-[170px] flex-[0.55] flex-col border-t border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-xs font-semibold text-text">
            {t(translation.ApiStudio.Response)}
          </span>
          <button
            type="button"
            disabled
            title={t(translation.ApiStudio.ExportPending)}
            className="text-xs font-medium text-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t(translation.ApiStudio.ExportCollection)}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8 text-center">
          <p className="max-w-sm text-xs leading-5 text-muted">
            {t(translation.ApiStudio.ResponseEmpty)}
          </p>
        </div>
      </section>
    </main>
  );
}
