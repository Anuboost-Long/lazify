import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { RouteScripts, SavedRoute } from "../types";
import type { RequestTab } from "./RequestDetails";

interface RequestTabsProps {
  route: SavedRoute;
  scripts: RouteScripts;
  active: RequestTab;
  onSelect: (tab: RequestTab) => void;
}

interface TabView {
  id: RequestTab;
  label: string;
  count: number | null;
  marked: boolean;
}

export function tabsFor(route: SavedRoute, scripts: RouteScripts): TabView[] {
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
    }
  ];
}

export function RequestTabs({ route, scripts, active, onSelect }: Readonly<RequestTabsProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex border-b border-border px-4">
      {tabsFor(route, scripts).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={clsx(
            "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium",
            "transition-colors",
            active === tab.id
              ? "border-accent text-text"
              : "border-transparent text-muted hover:text-text"
          )}
        >
          {t(tab.label)}
          {tab.count ? (
            <span className="rounded-full bg-text/[0.06] px-1.5 text-[10px] text-muted">
              {tab.count}
            </span>
          ) : null}
          {tab.marked ? <span className="size-1.5 rounded-full bg-accent" aria-hidden /> : null}
        </button>
      ))}
    </div>
  );
}
