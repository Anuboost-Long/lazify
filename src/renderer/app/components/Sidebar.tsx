import type {
  AppPageId,
  AppPageLink,
} from "@renderer/app/app-sidebar.constant";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, Typography } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  return (
    <aside
      className={clsx(
        "relative z-40 flex h-full shrink-0 flex-col",
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
              "text-muted hover:border-border hover:bg-bg hover:text-text"
            )}
            aria-label={collapsed ? t(translation.Sidebar.Open) : t(translation.Sidebar.Collapse)}
            title={collapsed ? t(translation.Sidebar.Open) : t(translation.Sidebar.Collapse)}
          >
            <UiIcon
              name={collapsed ? "menu" : "arrow-left"}
              className="h-5 w-5"
            />
          </button>

          {!collapsed ? (
            <div className="min-w-0">
              <CardTitle className="text-sm">{t(translation.Sidebar.AppName)}</CardTitle>
              <BodyText className="text-xs text-muted">{t(translation.Sidebar.AppSubtitle)}</BodyText>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onStartWorkflow}
          className={clsx(
            "mb-4 flex items-center gap-3",
            "rounded-xl border border-border bg-bg px-3 py-3",
            "text-sm font-medium text-text hover:border-accent"
          )}
          aria-label={t(translation.Sidebar.StartNewWorkflow)}
          title={t(translation.Sidebar.StartNewWorkflow)}
        >
          <UiIcon name="play" className="h-4 w-4 text-accent" />
          {!collapsed ? (
            <Typography as="span" variant="body" className="text-inherit">
              {t(translation.Sidebar.NewWorkflow)}
            </Typography>
          ) : null}
        </button>

        <nav className="flex flex-1 flex-col gap-1">
          {pages.map((page) => {
            const isActive = page.id === activePage;

            return (
              <button
                key={page.id}
                type="button"
                onClick={() => {
                  console.log(page.path);
                  onNavigate(page.path);
                }}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-3",
                  "text-left text-sm",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-bg text-text"
                    : "text-muted hover:bg-bg/70 hover:text-text"
                )}
                aria-label={t(page.label)}
                title={t(page.label)}
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
                    <Typography variant="body" className="truncate font-medium text-inherit">
                      {t(page.label)}
                    </Typography>
                    <BodyText className="truncate text-xs text-muted">
                      {t(page.description)}
                    </BodyText>
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
              "text-sm text-muted hover:bg-bg/70 hover:text-text",
              collapsed && "justify-center px-0"
            )}
            aria-label={t(translation.Sidebar.ToggleTheme)}
            title={`${t(translation.Sidebar.Theme)}: ${theme}`}
          >
            <UiIcon
              name={theme === "dark" ? "sun" : "moon"}
              className="h-5 w-5 shrink-0 text-muted"
            />
            {!collapsed ? (
              <div className="min-w-0">
                <Typography variant="body" className="font-medium text-text">
                  {t(translation.Sidebar.Theme)}
                </Typography>
                <BodyText className="text-xs capitalize text-muted">
                  {theme === "dark" ? t(translation.Settings.Dark) : t(translation.Settings.Light)}
                </BodyText>
              </div>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
