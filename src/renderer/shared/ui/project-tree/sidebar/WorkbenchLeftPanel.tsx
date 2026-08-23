import clsx from "clsx";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { SidebarView } from "./types";

interface WorkbenchLeftPanelProps {
  views: SidebarView[];
  activeId: string;
  onChange: (id: string) => void;
}

export function WorkbenchLeftPanel({
  views,
  activeId,
  onChange
}: Readonly<WorkbenchLeftPanelProps>) {
  const active = views.find((view) => view.id === activeId) ?? views[0];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      <div className="flex shrink-0 items-center gap-0.5 border-b border-border bg-soft px-2 py-1.5">
        {views.map((view) => {
          const selected = view.id === active?.id;

          return (
            <Tooltip key={view.id} content={view.label} side="bottom">
              <button
                type="button"
                onClick={() => onChange(view.id)}
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
            </Tooltip>
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
