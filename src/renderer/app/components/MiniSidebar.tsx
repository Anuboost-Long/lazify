import clsx from "clsx";
import type { AppPageId, AppPageLink } from "@renderer/app/app-sidebar.constant";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface MiniSidebarProps {
  pages: AppPageLink[];
  activePage: AppPageId | null;
  visible: boolean;
  onExpand: () => void;
  onNavigate: (path: string) => void;
}

export function MiniSidebar({
  pages,
  activePage,
  visible,
  onExpand,
  onNavigate
}: MiniSidebarProps) {
  return (
    <aside
      className={clsx(
        "flex h-full flex-col items-center",
        "rounded-shell border border-border bg-soft p-3",
        "shadow-panel transition-opacity duration-200",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <button
        type="button"
        onClick={onExpand}
        className={clsx(
          "group flex h-11 w-11 items-center justify-center",
          "rounded-2xl border border-border bg-bg",
          "text-muted transition hover:border-accent hover:bg-accentSoft"
        )}
        aria-label="Expand sidebar"
        title="Expand sidebar"
      >
        <UiIcon name="menu" className="h-5 w-5 text-muted group-hover:text-accent" />
      </button>

      <div className="mt-4 flex flex-1 flex-col items-center gap-2">
        {pages.map((page) => {
          const active = page.id === activePage;

          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onNavigate(page.path)}
              className={clsx(
                "group flex h-11 w-11 items-center justify-center",
                "rounded-2xl transition",
                active ? "bg-accentSoft text-accent" : "text-muted hover:text-text"
              )}
              aria-label={page.label}
              title={page.label}
            >
              <UiIcon
                name={page.icon}
                className={clsx(
                  "h-5 w-5",
                  active ? "text-accent" : "text-muted group-hover:text-accent"
                )}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
