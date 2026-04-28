import { useLazifyStore } from "@renderer/shared/hooks/use-lazify-store";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { appSidebarPages, type AppPageId } from "./app-sidebar.constant";
import { MiniSidebar } from "./components/MiniSidebar";
import { Sidebar } from "./components/Sidebar";

const SIDEBAR_ANIMATION_MS = 300;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const store = useLazifyStore();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const storedTheme = window.localStorage.getItem("lazify-theme");
    return storedTheme === "light" ? "light" : "dark";
  });
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    const stored = window.localStorage.getItem("lazify-sidebar-open");
    return stored === null ? true : stored === "true";
  });
  const [miniSidebarVisible, setMiniSidebarVisible] = useState<boolean>(() => {
    const stored = window.localStorage.getItem("lazify-sidebar-open");
    return stored === "false";
  });
  const { bootstrap, bindEvents } = store;

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

  useEffect(() => {
    if (sidebarOpen) {
      setMiniSidebarVisible(false);
      return;
    }

    const timeout = window.setTimeout(() => {
      setMiniSidebarVisible(true);
    }, SIDEBAR_ANIMATION_MS);

    return () => window.clearTimeout(timeout);
  }, [sidebarOpen]);

  const activePage: AppPageId =
    appSidebarPages.find((page) => location.pathname === page.path)?.id ??
    "workspace";

  return (
    <main className="relative h-screen bg-bg text-text ">
      <div className="relative mx-auto flex h-screen w-full gap-6 p-[40px] overflow-hidden">
        <div
          className={`relative z-20 shrink-0 ${
            miniSidebarVisible ? "w-[72px]" : "w-[320px]"
          }`}
        >
          <div
            className={clsx("absolute inset-0", !sidebarOpen ? "z-0" : "z-10")}
          >
            <Sidebar
              pages={appSidebarPages}
              activePage={activePage}
              isOpen={sidebarOpen}
              theme={theme}
              onToggleSidebar={() => setSidebarOpen(false)}
              onNavigate={navigate}
              onToggleTheme={() =>
                setTheme((current) => (current === "dark" ? "light" : "dark"))
              }
            />
          </div>

          <div
            className={clsx(
              "absolute inset-0 left-[10px]",
              !sidebarOpen ? "z-10" : "z-0"
            )}
          >
            <MiniSidebar
              pages={appSidebarPages}
              activePage={activePage}
              visible={miniSidebarVisible}
              onExpand={() => {
                setMiniSidebarVisible(false);
                setSidebarOpen(true);
              }}
              onNavigate={navigate}
            />
          </div>
        </div>

        <div
          className="relative z-10 min-w-0 overflow-y-auto pr-1 xl:h-[calc(100vh-3rem)]"
          style={{
            width: sidebarOpen
              ? "calc(100% - 320px - 1.5rem)"
              : miniSidebarVisible
              ? "calc(100% - 72px - 1.5rem)"
              : "calc(100% - 320px - 1.5rem)",
          }}
        >
          <Outlet context={store} />
        </div>
      </div>
    </main>
  );
}
