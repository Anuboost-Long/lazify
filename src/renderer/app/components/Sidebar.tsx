import clsx from "clsx";
import type {
  AppPageId,
  AppPageLink,
} from "@renderer/app/app-sidebar.constant";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface SidebarProps {
  pages: AppPageLink[];
  activePage: AppPageId | null;
  collapsed: boolean;
  theme: "light" | "dark";
  onStartWorkflow: () => void;
  onToggleSidebar: () => void;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  pages,
  activePage,
  collapsed,
  theme,
  onStartWorkflow,
  onToggleSidebar,
  onNavigate,
  onToggleTheme,
}: SidebarProps) {
  return (
    <aside
      className={clsx(
        "flex h-full shrink-0 flex-col",
        "border-r border-border bg-soft",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[72px]" : "w-[280px]"
      )}
    >
      <div className="flex h-full flex-col p-3">
        <div className="flex items-center gap-2 pb-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={clsx(
              "flex h-10 w-10 items-center justify-center",
              "rounded-xl border border-transparent bg-transparent",
              "text-muted transition hover:border-border hover:bg-bg hover:text-text"
            )}
            aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"}
            title={collapsed ? "Open sidebar" : "Collapse sidebar"}
          >
            <UiIcon
              name={collapsed ? "menu" : "arrow-left"}
              className="h-5 w-5"
            />
          </button>

          {!collapsed ? (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text">Lazify</p>
              <p className="text-xs text-muted">Desktop workflow</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onStartWorkflow}
          className={clsx(
            "mb-4 flex items-center gap-3",
            "rounded-xl border border-border bg-bg px-3 py-3",
            "text-sm font-medium text-text transition hover:border-accent"
          )}
          aria-label="Start new workflow"
          title="Start new workflow"
        >
          <UiIcon name="play" className="h-4 w-4 text-accent" />
          {!collapsed ? <span>New workflow</span> : null}
        </button>

        <nav className="flex flex-1 flex-col gap-1">
          {pages.map((page) => {
            const isActive = page.id === activePage;

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => onNavigate(page.path)}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-3",
                  "text-left text-sm transition",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-bg text-text"
                    : "text-muted hover:bg-bg/70 hover:text-text"
                )}
                aria-label={page.label}
                title={page.label}
              >
                <UiIcon
                  name={page.icon}
                  className={clsx(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-accent" : "text-muted"
                  )}
                />

                {!collapsed ? (
                  <div className="min-w-0">
                    <p className="truncate font-medium text-inherit">
                      {page.label}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {page.description}
                    </p>
                  </div>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className={clsx(
              "flex w-full items-center gap-3 rounded-xl px-3 py-3",
              "text-sm text-muted transition hover:bg-bg/70 hover:text-text",
              collapsed && "justify-center px-0"
            )}
            aria-label="Toggle theme"
            title={`Theme: ${theme}`}
          >
            <UiIcon
              name={theme === "dark" ? "sun" : "moon"}
              className="h-5 w-5 shrink-0 text-muted"
            />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="font-medium text-text">Theme</p>
                <p className="text-xs capitalize text-muted">{theme}</p>
              </div>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
