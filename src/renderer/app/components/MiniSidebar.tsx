import type {
  AppPageId,
  AppPageLink,
} from "@renderer/app/app-sidebar.constant";
import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

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
  onNavigate,
}: MiniSidebarProps) {
  const { t } = useTranslation();

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
          "group flex h-11 w-11 items-center justify-center shrink-0",
          "rounded-2xl border border-border bg-bg",
          "text-muted hover:border-accent hover:bg-accentSoft"
        )}
        aria-label={t(translation.Sidebar.Expand)}
        title={t(translation.Sidebar.Expand)}
      >
        <UiIcon
          name="menu"
          className="h-5 w-5 text-muted group-hover:text-accent"
        />
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
                "rounded-2xl",
                active
                  ? "bg-accentSoft text-accent"
                  : "text-muted hover:text-text"
              )}
              aria-label={t(page.label)}
              title={t(page.label)}
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
