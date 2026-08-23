import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SavedRoute } from "../types";
import { MethodBadge } from "./MethodBadge";

interface RoutePickerRowProps {
  route: SavedRoute;
  picked: boolean;
  held: boolean;
  onToggle: () => void;
}

export function RoutePickerRow({ route, picked, held, onToggle }: Readonly<RoutePickerRowProps>) {
  const { t } = useTranslation();
  const marked = held || picked;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marked}
      disabled={held}
      onClick={onToggle}
      className={clsx(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left",
        "transition-colors",
        picked ? "bg-accent/[0.07]" : null,
        held ? "cursor-not-allowed opacity-55" : "hover:bg-text/[0.05]"
      )}
    >
      {marked ? (
        <UiIcon name="check-circle" filled className="h-4 w-4 shrink-0 text-accent" />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-full border border-border" />
      )}
      <MethodBadge method={route.method} />
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text">{route.path}</span>
      {held ? (
        <span className="shrink-0 text-[10px] text-muted">
          {t(translation.ApiStudio.AlreadyInFolder)}
        </span>
      ) : null}
      {!held && route.summary ? (
        <span className="min-w-0 max-w-[40%] truncate text-[11px] text-muted">{route.summary}</span>
      ) : null}
    </button>
  );
}
