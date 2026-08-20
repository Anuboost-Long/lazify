import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import type { SavedRoute } from "../types";
import { groupByResource, matchesQuery } from "./RouteList";
import { RoutePickerRow } from "./RoutePickerRow";

interface RoutePickerModalProps {
  open: boolean;
  targetName: string;
  routes: SavedRoute[];
  heldRouteIds: ReadonlySet<string>;
  onAdd: (routes: SavedRoute[]) => void;
  onClose: () => void;
}

export function RoutePickerModal(props: Readonly<RoutePickerModalProps>) {
  return (
    <BaseModal open={props.open} onClose={props.onClose}>
      {props.open ? <RoutePickerCard {...props} /> : null}
    </BaseModal>
  );
}

function RoutePickerCard({
  targetName,
  routes,
  heldRouteIds,
  onAdd,
  onClose
}: Readonly<RoutePickerModalProps>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleRoutes = normalizedQuery
    ? routes.filter((route) => matchesQuery(route, normalizedQuery))
    : routes;

  const toggle = (routeId: string) =>
    setPicked((current) =>
      current.includes(routeId)
        ? current.filter((id) => id !== routeId)
        : [...current, routeId]
    );

  return (
    <div
      className={clsx(
        "flex max-h-[80vh] w-[min(560px,92vw)] flex-col overflow-hidden",
        "rounded-2xl border border-border bg-bg shadow-2xl"
      )}
    >
      <header className="flex flex-col gap-3 border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">
              {t(translation.ApiStudio.PickRequestsTitle, { target: targetName })}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {t(translation.ApiStudio.PickRequestsDesc)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(translation.ApiStudio.Close)}
            className="shrink-0 text-muted transition-colors hover:text-text"
          >
            <UiIcon name="xmark" className="h-4 w-4" />
          </button>
        </div>

        <label className="relative block">
          <span className="sr-only">{t(translation.ApiStudio.SearchRoutes)}</span>
          <UiIcon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            disabled={routes.length === 0}
            placeholder={t(translation.ApiStudio.SearchRoutes)}
            onChange={(event) => setQuery(event.target.value)}
            className={clsx(
              "h-9 w-full rounded-lg border border-border bg-bg/45 pl-9 pr-3",
              "text-xs text-text outline-none placeholder:text-muted/70",
              "focus:border-accent/50 disabled:cursor-not-allowed disabled:opacity-55"
            )}
          />
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {visibleRoutes.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs leading-5 text-muted">
            {routes.length === 0
              ? t(translation.ApiStudio.NoRoutesToPick)
              : t(translation.ApiStudio.NoRoutesMatch, { query: query.trim() })}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {groupByResource(visibleRoutes).map(([resource, resourceRoutes]) => (
              <li key={resource} className="flex flex-col gap-0.5">
                <span className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {resource || t(translation.ApiStudio.Root)}
                </span>
                {resourceRoutes.map((route) => (
                  <RoutePickerRow
                    key={route.id}
                    route={route}
                    picked={picked.includes(route.id)}
                    held={heldRouteIds.has(route.id)}
                    onToggle={() => toggle(route.id)}
                  />
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-muted transition-colors hover:text-text"
        >
          {t(translation.GlobalTerm.Cancel)}
        </button>
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={() => onAdd(routes.filter((route) => picked.includes(route.id)))}
          className={clsx(
            "flex h-8 items-center rounded-lg bg-accent px-3 text-xs font-semibold text-bg",
            "transition-colors hover:bg-accentHover",
            "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-accent"
          )}
        >
          {t(translation.ApiStudio.AddRequests, { count: picked.length })}
        </button>
      </div>
    </div>
  );
}
