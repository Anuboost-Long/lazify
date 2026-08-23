import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SavedRoute } from "../types";
import { MethodBadge } from "./MethodBadge";

interface RouteRowProps {
  route: SavedRoute;
  selected: boolean;
  foundByLastScan: boolean;
  onSelect: (routeId: string) => void;
}

export function RouteRow({
  route,
  selected,
  foundByLastScan,
  onSelect
}: Readonly<RouteRowProps>) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={() => onSelect(route.id)}
      className={clsx(
        "flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left",
        "transition-colors",
        selected ? "bg-accent/10" : "hover:bg-text/[0.04]"
      )}
    >
      <MethodBadge method={route.method} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span
          className={clsx(
            "block truncate font-mono text-[11px]",
            selected ? "text-accent" : "text-text"
          )}
        >
          {route.path}
        </span>
        {foundByLastScan ? (
          <span className="ml-1 rounded bg-success/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-success">
            {t(translation.ApiStudio.NewRoute)}
          </span>
        ) : null}
        {route.summary ? (
          <span className="mt-0.5 block truncate text-[10px] leading-4 text-muted">
            {route.summary}
          </span>
        ) : null}
      </span>
    </button>
  );
}
