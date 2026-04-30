import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { appRoute } from "./app-routes";
import { appSidebarPages, type AppPageId } from "./app-sidebar.constant";
import { Sidebar } from "./components/Sidebar";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const storedTheme = window.localStorage.getItem("lazify-theme");
    return storedTheme === "light" ? "light" : "dark";
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const stored = window.localStorage.getItem("lazify-sidebar-open");
    return stored === null ? true : stored === "true";
  });
  const { bootstrap, bindEvents } = useLazifyStore();

  useEffect(() => {
    void bootstrap();
    const cleanup = bindEvents();
    return cleanup;
  }, [bindEvents, bootstrap]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("lazify-theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("lazify-sidebar-open", String(sidebarOpen));
  }, [sidebarOpen]);

  const activePageId: AppPageId | null =
    appSidebarPages.find((page) => location.pathname === page.path)?.id ?? null;
  const activePage =
    location.pathname === appRoute.initProject
      ? {
          label: "Init project",
          description: "Choose a stack to begin a new project.",
        }
      : appSidebarPages.find((page) => page.id === activePageId) ??
        appSidebarPages[0];

  return (
    <main className="flex h-screen bg-bg text-text">
      <div className="flex min-h-0 flex-1">
        <Sidebar
          pages={appSidebarPages}
          activePage={activePageId}
          collapsed={!sidebarOpen}
          theme={theme}
          onStartWorkflow={() => navigate(appRoute.initProject)}
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
          onNavigate={navigate}
          onToggleTheme={() =>
            setTheme((current) => (current === "dark" ? "light" : "dark"))
          }
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <div
            className={clsx(
              "flex h-14 shrink-0 items-center justify-between gap-4",
              "border-b border-border bg-bg px-4"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {activePage.label}
                </p>
                <p className="truncate text-xs text-muted">
                  {activePage.description}
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1560px] px-6 py-6 lg:px-8">
              <Outlet />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
