import type {
  AppPageId,
  AppPageLink,
} from "@renderer/app/app-sidebar.constant";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface SidebarProps {
  pages: AppPageLink[];
  activePage: AppPageId;
  isOpen: boolean;
  theme: "light" | "dark";
  onToggleSidebar: () => void;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  pages,
  activePage,
  isOpen,
  theme,
  onToggleSidebar,
  onNavigate,
  onToggleTheme,
}: SidebarProps) {
  return (
    <aside
      className={`flex h-[calc(100vh-3rem)] flex-col rounded-shell border border-border bg-soft p-4 shadow-[0_0_8px_rgba(0,0,0,0.4)] backdrop-blur transition-transform duration-300 ease-out ${
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%)]"
      }`}
      style={{ pointerEvents: isOpen ? "auto" : "none" }}
    >
      <div
        className={`border-b border-border px-2 pb-4 transition-all duration-300 ease-out ${
          isOpen
            ? "translate-x-0 opacity-100 delay-75"
            : "-translate-x-4 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-accent">
              Lazify
            </p>
            <h1 className="mt-2 font-display text-4xl leading-none text-text">
              Control Bay
            </h1>
          </div>
          <button
            type="button"
            onClick={onToggleSidebar}
            className="group flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-bg text-muted transition hover:border-accent hover:bg-accentSoft"
            aria-label="Hide sidebar"
            title="Hide sidebar"
          >
            <UiIcon
              name="arrow-left"
              className="h-5 w-5 text-muted group-hover:text-accent"
            />
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">
          Move between project setup, logs, templates, and system status from
          one desktop shell.
        </p>
      </div>

      <nav
        className={`mt-4 flex flex-1 flex-col gap-2 transition-all duration-300 ease-out ${
          isOpen
            ? "translate-x-0 opacity-100 delay-100"
            : "-translate-x-4 opacity-0"
        }`}
      >
        {pages.map((page) => {
          const isActive = page.id === activePage;

          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onNavigate(page.path)}
              className={`group rounded-[22px] border px-4 py-4 text-left transition ${
                isActive
                  ? "border-border bg-accentSoft text-accent shadow-glow"
                  : "border-transparent bg-transparent text-muted hover:text-text"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-2xl border p-2 ${
                    isActive
                      ? "border-border bg-accentSoft text-accent"
                      : "border-border bg-bg text-muted"
                  }`}
                >
                  <UiIcon
                    name={page.icon}
                    className={`h-5 w-5 ${
                      isActive
                        ? "text-accent"
                        : "text-muted group-hover:text-accent"
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      isActive ? "text-accent" : "text-inherit"
                    }`}
                  >
                    {page.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {page.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleTheme}
        className={`group mb-3 flex items-center justify-between rounded-[22px] border border-border bg-bg px-4 py-4 text-left transition-all duration-300 ease-out hover:border-accent hover:text-text ${
          isOpen
            ? "translate-x-0 opacity-100 delay-150"
            : "-translate-x-4 opacity-0"
        }`}
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted group-hover:text-text">
            <UiIcon
              name={theme === "dark" ? "sun" : "moon"}
              className="h-4 w-4 text-muted group-hover:text-accent"
            />
            Theme
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Switch between light and dark workspace modes.
          </p>
        </div>
        <div className="rounded-full border border-border bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {theme}
        </div>
      </button>

      <div
        className={`rounded-[22px] border border-border bg-bg px-4 py-4 transition-all duration-300 ease-out ${
          isOpen
            ? "translate-x-0 opacity-100 delay-[175ms]"
            : "-translate-x-4 opacity-0"
        }`}
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          <UiIcon name="activity" className="h-4 w-4 text-accent" />
          Navigation Ready
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">
          The sidebar is now the primary way to manage Lazify features as more
          pages are added.
        </p>
      </div>
    </aside>
  );
}
