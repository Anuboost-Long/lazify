import { translation } from "@renderer/i18n/translation";
import { useAccentColor } from "@renderer/shared/hooks/use-accent-color";
import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import {
  useSetResolvedTheme,
  useTheme,
} from "@renderer/shared/hooks/use-theme";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { appRoute } from "./app-routes";
import { appSidebarPages, type AppPageId } from "./app-sidebar.constant";
import { BrowserSurface } from "@renderer/features/browser/components/BrowserSurface";
import { ContentBackdrop } from "./components/ContentBackdrop";
import { PageChromeContext } from "./components/PageChrome";
import { Sidebar } from "./components/Sidebar";

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { themePreference, setThemePreference } = useTheme();
  const setResolvedTheme = useSetResolvedTheme();
  const { accentColor } = useAccentColor();
  const { compactSidebar, reduceMotion, showTooltips } = useInterfaceSettings();
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => globalThis.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const stored = globalThis.localStorage.getItem("lazify-sidebar-open");
    return stored === null ? true : stored === "true";
  });
  const { bootstrap, bindEvents } = useLazifyStore();

  const sysPreference = systemPrefersDark ? "dark" : "light";

  const resolvedTheme: "dark" | "light" =
    themePreference === "system" ? sysPreference : themePreference;

  useEffect(() => {
    void bootstrap();
    const cleanup = bindEvents();
    return cleanup;
  }, [bindEvents, bootstrap]);

  // Track system preference changes
  useEffect(() => {
    const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply resolved theme and accent to DOM
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    setResolvedTheme(resolvedTheme);
  }, [resolvedTheme, setResolvedTheme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accentColor;
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    globalThis.localStorage.setItem("lazify-sidebar-open", String(sidebarOpen));
  }, [sidebarOpen]);

  const activePageId: AppPageId | null =
    appSidebarPages.find(
      (page) =>
        location.pathname === page.path ||
        (page.id === "workspace" &&
          location.pathname.startsWith("/workspace/project/")) ||
        // Legal documents are reached from Settings, so keep it highlighted.
        (page.id === "settings" && location.pathname.startsWith("/legal/")),
    )?.id ?? null;

  const activePage =
    location.pathname === appRoute.initProject
      ? {
          path: appRoute.initProject,
          label: translation.Sidebar.InitProject,
          description: translation.Sidebar.InitProjectDesc,
          icon: "plus" as const,
        }
      : (appSidebarPages.find((page) => page.id === activePageId) ??
        appSidebarPages[0]);

  // The project workbench manages its own height and scrolling, so it opts out
  // of the padded, scrolling container every other route uses.
  const fullBleed = location.pathname.startsWith("/workspace/project/");

  // Slots pages portal their breadcrumb tail and actions into.
  const [crumbSlot, setCrumbSlot] = useState<HTMLElement | null>(null);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
  const chromeSlots = useMemo(
    () => ({ crumb: crumbSlot, actions: actionSlot }),
    [crumbSlot, actionSlot],
  );

  return (
    <main className="flex h-screen bg-bg text-text">
      {/* min-w-0 is load-bearing: without it this flex item cannot shrink below
          its content's min-content width, so any page holding one long
          unbreakable string pushes the whole window wider than the screen. */}
      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar
          pages={appSidebarPages}
          activePage={activePageId}
          collapsed={compactSidebar || !sidebarOpen}
          theme={resolvedTheme}
          compactMode={compactSidebar}
          showTooltips={showTooltips}
          onStartWorkflow={() => navigate(appRoute.initProject)}
          onToggleSidebar={() => {
            if (!compactSidebar) setSidebarOpen((c) => !c);
          }}
          onNavigate={navigate}
          onToggleTheme={() =>
            setThemePreference(resolvedTheme === "dark" ? "light" : "dark")
          }
        />

        <section className="relative flex min-w-0 flex-1 flex-col">
          {/* Breadcrumb bar. One line instead of a label-over-description
              stack, and pages fill the tail and the action slot themselves —
              so this is 40px that does work rather than 56px that repeats
              the sidebar. The description rides along inline when there is
              room, and stays as the hover title when there is not. */}
          <div
            className={clsx(
              "flex h-10 shrink-0 items-center gap-2",
              "border-b border-border bg-bg px-4",
            )}
          >
            <UiIcon
              name={activePage.icon}
              className="h-3.5 w-3.5 shrink-0 text-accent"
            />

            <button
              type="button"
              onClick={() => navigate(activePage.path)}
              title={t(activePage.description)}
              className="shrink-0 truncate text-xs font-semibold text-text transition-colors hover:text-accent"
            >
              {t(activePage.label)}
            </button>

            <div
              ref={setCrumbSlot}
              className="peer flex min-w-0 items-center gap-2"
            />

            {/* Says what the page is for, but only where there is room and
                only while the page has not pushed a crumb of its own — a
                breadcrumb tail is more specific than a static blurb. */}
            <span className="hidden min-w-0 truncate text-[11px] text-muted lg:peer-empty:block">
              {t(activePage.description)}
            </span>

            <div
              ref={setActionSlot}
              className="ml-auto flex shrink-0 items-center gap-2"
            />
          </div>

          {/* Sits behind the scroll container rather than inside it, so the
              art stays put while the page moves. The workbench opts out — it
              is dense enough that anything behind it reads as noise. */}
          {!fullBleed && <ContentBackdrop className="top-10" />}

          <PageChromeContext.Provider value={chromeSlots}>
            <div
              className={clsx(
                "relative min-h-0 flex-1",
                fullBleed ? "overflow-hidden" : "overflow-y-auto",
              )}
            >
              <div
                className={clsx(
                  "mx-auto w-full",
                  fullBleed
                    ? "h-full max-w-none px-4 py-3"
                    : "max-w-[1560px] px-6 py-6 lg:px-8",
                )}
              >
                <Outlet />
              </div>
            </div>
          </PageChromeContext.Provider>

          {/* Mounted by the shell, not by its route: leaving the page moves
              this aside instead of unmounting it, so a video or a track keeps
              playing while the user works elsewhere. It covers the content
              area — including the breadcrumb bar, which a browser does not
              need — whenever the browser page is the one being shown. */}
          <BrowserSurface visible={location.pathname === appRoute.browser} />
        </section>
      </div>
    </main>
  );
}
