import { translation } from "@renderer/i18n/translation";
import { useAccentColor } from "@renderer/shared/hooks/use-accent-color";
import { useInterfaceSettings } from "@renderer/shared/hooks/use-interface-settings";
import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import { useRouteMemory } from "@renderer/shared/hooks/use-route-memory";
import {
  useSetResolvedTheme,
  useTheme,
} from "@renderer/shared/hooks/use-theme";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { appRoute } from "./app-routes";
import { appSidebarPages, type AppPageId } from "./app-sidebar.constant";
import { AgentDoneToast } from "@renderer/features/agents/components/AgentDoneToast";
import { useAgentActivityRecorder } from "@renderer/features/agents/hooks/use-agent-activity";
import { BrowserSurface } from "@renderer/features/browser/components/BrowserSurface";
import { availableTools } from "@renderer/features/tools/catalog";
import { usePinnedTools } from "@renderer/features/tools/hooks/use-pinned-tools";
import { ContentBackdrop } from "./components/ContentBackdrop";
import { PageChromeContext } from "./components/PageChrome";
import { Sidebar } from "./components/Sidebar";
import { FailureToastHost } from "@renderer/shared/ui/toast/FailureToastHost";

function RouteFallback() {
  return <div className="h-full w-full" aria-busy="true" />;
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { themePreference, setThemePreference } = useTheme();
  const setResolvedTheme = useSetResolvedTheme();
  const { accentColor } = useAccentColor();
  const { compactSidebar, reduceMotion, rememberRoute } = useInterfaceSettings();
  const { remember, recall } = useRouteMemory();
  const { pinnedToolIds } = usePinnedTools();
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => globalThis.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const stored = globalThis.localStorage.getItem("lazify-sidebar-open");
    return stored === null ? true : stored === "true";
  });
  const { bootstrap, bindEvents } = useLazifyStore();

  // Recorded here rather than on the agents page: an agent asks or finishes
  // while the user is wherever they happen to be, and the feed has to have it.
  useAgentActivityRecorder();

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

  // A page link leads back to the sub-route last seen there, so returning to
  // the workbench or a tool does not mean picking the project out again.
  useEffect(() => {
    if (rememberRoute) remember(location.pathname);
  }, [location.pathname, rememberRoute, remember]);

  // The pages this OS can offer. Computed here rather than beside the list so
  // it is not a module-load-time read of the preload bridge — a constant that
  // throws on import would take the whole window down with it.
  const pages = useMemo(
    () =>
      appSidebarPages.filter(
        (page) => !page.macOnly || globalThis.lazify.platform === "darwin",
      ),
    [],
  );
  const pinnedTools = availableTools(globalThis.lazify.platform).filter((tool) =>
    pinnedToolIds.includes(tool.id)
  );

  const activePageId: AppPageId | null =
    pages.find(
      (page) =>
        location.pathname === page.path ||
        (page.id === "workspace" &&
          location.pathname.startsWith("/workspace/project/")) ||
        (page.id === "templates" &&
          location.pathname.startsWith(`${appRoute.templates}/`)) ||
        (page.id === "tools" && location.pathname.startsWith(`${appRoute.tools}/`)) ||
        // Legal documents are reached from Settings, so keep it highlighted.
        (page.id === "settings" && location.pathname.startsWith("/legal/")),
    )?.id ?? null;

  const activePage =
    location.pathname.startsWith(appRoute.initProject)
      ? {
          path: appRoute.initProject,
          label: translation.Sidebar.InitProject,
          description: translation.Sidebar.InitProjectDesc,
          icon: "plus" as const,
        }
      : (pages.find((page) => page.id === activePageId) ?? pages[0]);

  // The project workbench and the agents wall both manage their own height and
  // scrolling, so they opt out of the padded, scrolling container every other
  // route uses. Terminals are the reason: they need every pixel of width a big
  // screen has, and a fixed max-width would leave them stranded mid-window.
  const fullBleed =
    location.pathname.startsWith("/workspace/project/") ||
    location.pathname === appRoute.agents ||
    // Tools are workbenches: they fill the window and scroll their own panes,
    // rather than sitting as a card in a scrolling page.
    location.pathname.startsWith(`${appRoute.tools}/`);

  // Slots pages portal their breadcrumb tail and actions into.
  const [crumbSlot, setCrumbSlot] = useState<HTMLElement | null>(null);
  const [actionSlot, setActionSlot] = useState<HTMLElement | null>(null);
  const chromeSlots = useMemo(
    () => ({ crumb: crumbSlot, actions: actionSlot }),
    [crumbSlot, actionSlot],
  );

  return (
    <main className="flex h-screen bg-bg text-text">
      <FailureToastHost />

      {/* min-w-0 is load-bearing: without it this flex item cannot shrink below
          its content's min-content width, so any page holding one long
          unbreakable string pushes the whole window wider than the screen. */}
      <div className="flex min-h-0 min-w-0 flex-1">
        <Sidebar
          pages={pages}
          pinnedTools={pinnedTools}
          activePath={location.pathname}
          activePage={activePageId}
          collapsed={compactSidebar || !sidebarOpen}
          theme={resolvedTheme}
          compactMode={compactSidebar}
          onStartWorkflow={() => navigate(appRoute.initProject)}
          onToggleSidebar={() => {
            if (!compactSidebar) setSidebarOpen((c) => !c);
          }}
          onNavigate={(path) => navigate(rememberRoute ? recall(path) : path)}
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
            {/* Shown only where there is somewhere to go up to, so the bar
                stays a breadcrumb rather than growing a permanent control. */}
            {location.pathname !== activePage.path ? (
              <Tooltip content={t(translation.GlobalTerm.Back)} side="bottom">
                <button
                  type="button"
                  aria-label={t(translation.GlobalTerm.Back)}
                  onClick={() => navigate(activePage.path)}
                  className={clsx(
                    "-ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    "text-muted transition-colors hover:bg-text/[0.04] hover:text-accent",
                  )}
                >
                  <UiIcon name="arrow-left" className="h-3.5 w-3.5" />
                </button>
              </Tooltip>
            ) : null}

            <UiIcon
              name={activePage.icon}
              className="h-3.5 w-3.5 shrink-0 text-accent"
            />

            <Tooltip content={t(activePage.description)} side="bottom">
              <button
                type="button"
                onClick={() => navigate(activePage.path)}
                className="shrink-0 truncate text-xs font-semibold text-text transition-colors hover:text-accent"
              >
                {t(activePage.label)}
              </button>
            </Tooltip>

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
                    ? "h-full max-w-none p-4"
                    : "max-w-[1560px] px-6 py-6 lg:px-8",
                )}
              >
                <Suspense fallback={<RouteFallback />}>
                  <Outlet />
                </Suspense>
              </div>
            </div>
          </PageChromeContext.Provider>

          {/* Mounted by the shell, not by its route: leaving the page moves
              this aside instead of unmounting it, so a video or a track keeps
              playing while the user works elsewhere. It covers the content
              area — including the breadcrumb bar, which a browser does not
              need — whenever the browser page is the one being shown. */}
          <BrowserSurface visible={location.pathname === appRoute.browser} />

          {/* Shell-level so a turn that ends while the user is on another page
              still announces itself, and can take them back to the tab. */}
          <AgentDoneToast />
        </section>
      </div>
    </main>
  );
}
