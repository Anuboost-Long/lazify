import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { useTheme } from "@renderer/shared/hooks/use-theme";
import { useAccentColor } from "@renderer/shared/hooks/use-accent-color";
import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";
import { translation } from "@renderer/i18n/translation";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { appRoute } from "./app-routes";
import { appSidebarPages, type AppPageId } from "./app-sidebar.constant";
import { Sidebar } from "./components/Sidebar";
import { BodyText, CardTitle } from "@renderer/shared/typography";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { themePreference, setThemePreference } = useTheme();
  const { accentColor } = useAccentColor();
  const { compactSidebar, reduceMotion, showTooltips } = useInterfaceSettings();
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const stored = window.localStorage.getItem("lazify-sidebar-open");
    return stored === null ? true : stored === "true";
  });
  const { bootstrap, bindEvents } = useLazifyStore();

  const resolvedTheme: "dark" | "light" =
    themePreference === "system"
      ? systemPrefersDark ? "dark" : "light"
      : themePreference;

  useEffect(() => {
    void bootstrap();
    const cleanup = bindEvents();
    return cleanup;
  }, [bindEvents, bootstrap]);

  // Track system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply resolved theme and accent to DOM
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accentColor;
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    window.localStorage.setItem("lazify-sidebar-open", String(sidebarOpen));
  }, [sidebarOpen]);

  const activePageId: AppPageId | null =
    appSidebarPages.find((page) =>
      location.pathname === page.path ||
      (page.id === "workspace" && location.pathname.startsWith("/workspace/project/"))
    )?.id ?? null;

  const activePage =
    location.pathname === appRoute.initProject
      ? {
          label: translation.Sidebar.InitProject,
          description: translation.Sidebar.InitProjectDesc,
        }
      : appSidebarPages.find((page) => page.id === activePageId) ??
        appSidebarPages[0];

  return (
    <main className="flex h-screen bg-bg text-text">
      <div className="flex min-h-0 flex-1">
        <Sidebar
          pages={appSidebarPages}
          activePage={activePageId}
          collapsed={compactSidebar || !sidebarOpen}
          theme={resolvedTheme}
          compactMode={compactSidebar}
          showTooltips={showTooltips}
          onStartWorkflow={() => navigate(appRoute.initProject)}
          onToggleSidebar={() => { if (!compactSidebar) setSidebarOpen((c) => !c); }}
          onNavigate={navigate}
          onToggleTheme={() =>
            setThemePreference(resolvedTheme === "dark" ? "light" : "dark")
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
                <CardTitle className="truncate text-sm">
                  {t(activePage.label)}
                </CardTitle>
                <BodyText className="truncate text-xs text-muted">
                  {t(activePage.description)}
                </BodyText>
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
