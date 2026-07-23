import clsx from "clsx";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SidebarView } from "./types";

/**
 * The workbench sidebar: one frame, several switchable views.
 *
 * This shell is deliberately ignorant of what the views are — it renders a tab
 * strip from whatever it is given and shows the active view's body. The
 * explorer and the source-control views live in their own files and know
 * nothing about each other or about this component.
 *
 * Every view stays mounted and is hidden with CSS rather than unmounted, so
 * switching away and back preserves scroll position in the virtualised tree.
 */

interface WorkbenchSidebarProps {
  views: SidebarView[];
  activeId: string;
  onChange: (id: string) => void;
}

export function WorkbenchSidebar({
  views,
  activeId,
  onChange
}: Readonly<WorkbenchSidebarProps>) {
  const active = views.find((view) => view.id === activeId) ?? views[0];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Tab strip — replaces the header each view used to draw for itself. */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-border bg-soft px-2 py-1.5">
        {views.map((view) => {
          const selected = view.id === active?.id;

          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onChange(view.id)}
              title={view.label}
              aria-label={view.label}
              aria-pressed={selected}
              className={clsx(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                selected
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-accent/[0.06] hover:text-text"
              )}
            >
              <UiIcon name={view.icon} className="h-4 w-4" />
            </button>
          );
        })}

        {active?.actions ? (
          <div className="ml-auto flex shrink-0 items-center gap-1">{active.actions}</div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        {views.map((view) => (
          <div
            key={view.id}
            className={clsx("h-full", view.id === active?.id ? "" : "hidden")}
          >
            {view.content}
          </div>
        ))}
      </div>
    </div>
  );
}
