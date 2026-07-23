import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CardTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SidebarView } from "./types";

/**
 * The tool panel, as a sheet that slides over the whole editor area.
 *
 * A narrow side compartment left these panes too cramped to read — they are
 * dashboards and lists built for a full-width column — so opening one covers
 * the editor entirely and closing it slides back out.
 *
 * The sheet and every view inside it stay mounted at all times; closing only
 * translates the sheet off and disables pointer events. Unmounting would
 * strand the process a running script owns.
 */

interface WorkbenchToolOverlayProps {
  views: SidebarView[];
  activeId: string | null;
  onClose: () => void;
}

export function WorkbenchToolOverlay({
  views,
  activeId,
  onClose
}: Readonly<WorkbenchToolOverlayProps>) {
  const { t } = useTranslation();
  const active = views.find((view) => view.id === activeId) ?? null;
  const open = active !== null;

  return (
    <div
      aria-hidden={!open}
      className={clsx(
        "absolute inset-0 z-20 flex flex-col bg-bg",
        "transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      )}
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-soft pl-4 pr-2">
        {active ? (
          <UiIcon name={active.icon} className="h-4 w-4 shrink-0 text-accent" />
        ) : null}
        <CardTitle className="min-w-0 flex-1 truncate text-sm">{active?.label}</CardTitle>

        {active?.actions ? (
          <div className="flex shrink-0 items-center gap-1">{active.actions}</div>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          aria-label={t(translation.GlobalTerm.Close)}
          title={t(translation.GlobalTerm.Close)}
          className={clsx(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            "text-muted transition-colors hover:bg-text/10 hover:text-text"
          )}
        >
          <UiIcon name="xmark" className="h-4 w-4" />
        </button>
      </div>

      {/* No padding here — each pane owns its own, so they read as sections
          of this sheet rather than cards floating inside it. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {views.map((view) => (
          <div key={view.id} className={clsx(view.id === activeId ? "" : "hidden")}>
            {view.content}
          </div>
        ))}
      </div>
    </div>
  );
}
