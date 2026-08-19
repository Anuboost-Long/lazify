import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { resolveVariable, variablesForRoute } from "@main/api-studio/environment";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { ApiVariable, SavedRoute } from "../types";
import { MethodBadge } from "./MethodBadge";
import { RouteNeedsRow } from "./RouteNeedsRow";

interface RequestSummaryProps {
  route: SavedRoute;
  /** The URL as it will be sent, base included. */
  url: string;
  baseUrl: string;
  variables: ApiVariable[];
  values: Record<string, string>;
  onOpenEnvironment: () => void;
  onOpenSource: () => void;
}

function sourceLabel(route: SavedRoute) {
  const { filePath, line } = route.source;
  if (!filePath) return null;

  return line ? `${filePath}:${line}` : filePath;
}

export function RequestSummary({
  route,
  url,
  baseUrl,
  variables,
  values,
  onOpenEnvironment,
  onOpenSource
}: Readonly<RequestSummaryProps>) {
  const { t } = useTranslation();
  const needed = variablesForRoute(route);
  const source = sourceLabel(route);

  return (
    <div className="flex flex-col gap-1.5 border-b border-border px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <MethodBadge method={route.method} />
        <p className="min-w-0 flex-1 truncate font-mono text-xs text-text">
          <span className="text-muted">{baseUrl}</span>
          {url.slice(baseUrl.length)}
        </p>
      </div>

      <RouteNeedsRow
        names={needed}
        unset={needed.filter((name) => !resolveVariable(variables, values, name))}
        onOpenEnvironment={onOpenEnvironment}
      />

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {route.summary ? (
          <span className="text-[11px] leading-4 text-muted">{route.summary}</span>
        ) : null}

        {source ? (
          <button
            type="button"
            title={t(translation.ApiStudio.OpenInWorkspace)}
            onClick={onOpenSource}
            className={clsx(
              "flex items-center gap-1 rounded font-mono text-[10px] text-muted",
              "underline decoration-dotted underline-offset-2 transition-colors",
              "hover:text-accent"
            )}
          >
            <UiIcon name="page" className="h-3 w-3" />
            {source}
          </button>
        ) : null}
      </div>
    </div>
  );
}
