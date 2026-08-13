import type {
  AppPageId,
  AppPageLink,
} from "@renderer/app/app-sidebar.constant";
import { Logo } from "@renderer/assets/logo.tsx";
import { translation } from "@renderer/i18n/translation";
import { BodyText, CardTitle, Typography } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { SidebarMiniItem } from "./SidebarMiniItem";
import { SidebarNavItem } from "./SidebarNavItem";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

interface SidebarProps {
  pages: AppPageLink[];
  activePage: AppPageId | null;
  collapsed: boolean;
  theme: "light" | "dark";
  compactMode?: boolean;
  onStartWorkflow: () => void;
  onToggleSidebar: () => void;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
}

const LOGO_COLOR = "rgb(var(--color-text-muted))";
const LOGO_BOLT_COLOR = "rgb(var(--color-accent))";

export function Sidebar({
  pages,
  activePage,
  collapsed,
  theme,
  compactMode = false,
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
        {/* ── Header ─────────────────────────────── */}
        <div
          className={clsx(
            "flex items-center pb-3",
            collapsed ? "justify-center" : "gap-2"
          )}
        >
          {compactMode ? (
            /* Compact: static brand mark, matches nav item size */
            <div className="flex w-full items-center justify-center rounded-xl bg-accent/15 py-3">
              <Logo size={20} color={LOGO_COLOR} boltColor={LOGO_BOLT_COLOR} />
            </div>
          ) : collapsed ? (
            /* Collapsed: Logo IS the expand button, matches nav item size */
            <Tooltip content={t(translation.Sidebar.Open)} side="right">
              <button
                type="button"
                onClick={onToggleSidebar}
                className={clsx(
                  "flex w-full items-center justify-center",
                  "rounded-xl border border-transparent py-3",
                  "hover:border-border hover:bg-bg"
                )}
                aria-label={t(translation.Sidebar.Open)}
              >
                <Logo size={20} color={LOGO_COLOR} boltColor={LOGO_BOLT_COLOR} />
              </button>
            </Tooltip>
          ) : (
            /* Expanded: Logo + app name + collapse button */
            <>
              <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-2">
                <Logo
                  size={20}
                  color={LOGO_COLOR}
                  boltColor={LOGO_BOLT_COLOR}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <CardTitle className="text-sm">
                    {t(translation.Sidebar.AppName)}
                  </CardTitle>
                  <BodyText className="text-xs text-muted">
                    {t(translation.Sidebar.AppSubtitle)}
                  </BodyText>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleSidebar}
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center",
                  "rounded-xl border border-transparent text-muted",
                  "hover:border-border hover:bg-bg hover:text-text"
                )}
                aria-label={t(translation.Sidebar.Collapse)}
              >
                <UiIcon name="arrow-left" className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* ── New workflow button ─────────────────── */}
        <Tooltip
          content={collapsed ? t(translation.Sidebar.StartNewWorkflow) : null}
          side="right"
        >
          <button
            type="button"
            onClick={onStartWorkflow}
            className={clsx(
              "mb-4 flex items-center gap-3",
              "rounded-xl border border-border bg-bg px-3 py-3",
              "text-sm font-medium text-text hover:border-accent",
              collapsed && "justify-center px-0"
            )}
            aria-label={t(translation.Sidebar.StartNewWorkflow)}
          >
            <UiIcon name="play" filled className="h-4 w-4 shrink-0 text-accent" />
            {!collapsed && (
              <Typography as="span" variant="body" className="text-inherit">
                {t(translation.Sidebar.NewWorkflow)}
              </Typography>
            )}
          </button>
        </Tooltip>

        {/* ── Nav ────────────────────────────────── */}
        <nav className="flex flex-1 flex-col gap-1">
          {pages.map((page) => {
            const isActive = page.id === activePage;

            return collapsed ? (
              <SidebarMiniItem
                key={page.id}
                icon={page.icon}
                label={t(page.label)}
                isActive={isActive}
                onClick={() => onNavigate(page.path)}
              />
            ) : (
              <SidebarNavItem
                key={page.id}
                icon={page.icon}
                label={t(page.label)}
                description={t(page.description)}
                isActive={isActive}
                onClick={() => onNavigate(page.path)}
              />
            );
          })}
        </nav>

        {/* ── Theme toggle ───────────────────────── */}
        <div className="border-t border-border pt-3">
          <Tooltip
            content={collapsed ? `${t(translation.Sidebar.Theme)}: ${theme}` : null}
            side="right"
          >
            <button
              type="button"
              onClick={onToggleTheme}
              className={clsx(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3",
                "text-sm text-muted hover:bg-bg/70 hover:text-text",
                collapsed && "justify-center px-0"
              )}
              aria-label={t(translation.Sidebar.ToggleTheme)}
            >
            <UiIcon
              name={theme === "dark" ? "sun" : "moon"}
              className="h-5 w-5 shrink-0 text-muted"
            />
              {!collapsed && (
                <div className="min-w-0">
                  <Typography variant="body" className="font-medium text-text">
                    {t(translation.Sidebar.Theme)}
                  </Typography>
                  <BodyText className="text-xs capitalize text-muted">
                    {theme === "dark"
                      ? t(translation.Settings.Dark)
                      : t(translation.Settings.Light)}
                  </BodyText>
                </div>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
