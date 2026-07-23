import clsx from "clsx";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SidebarView } from "./types";

/**
 * The vertical icon strip on the right edge of the workbench.
 *
 * Clicking an icon opens its panel; clicking the open one closes it, which is
 * what keeps the editor at full height by default. Like the sidebar shell,
 * this knows nothing about the panels themselves — it renders whatever list it
 * is given and reports which one was clicked.
 */

interface WorkbenchToolRailProps {
  views: SidebarView[];
  /** Null when every panel is closed. */
  activeId: string | null;
  onChange: (id: string | null) => void;
}

export function WorkbenchToolRail({
  views,
  activeId,
  onChange
}: Readonly<WorkbenchToolRailProps>) {
  return (
    <div className="flex h-full w-10 shrink-0 flex-col items-center gap-1 border-l border-border bg-soft py-2">
      {views.map((view) => {
        const selected = view.id === activeId;

        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onChange(selected ? null : view.id)}
            title={view.label}
            aria-label={view.label}
            aria-pressed={selected}
            className={clsx(
              "relative flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              selected
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-accent/[0.06] hover:text-text"
            )}
          >
            {/* Accent rule on the outer edge marks the open panel. */}
            {selected ? (
              <span aria-hidden className="absolute inset-y-1 -right-2 w-0.5 rounded-full bg-accent" />
            ) : null}
            <UiIcon name={view.icon} className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
