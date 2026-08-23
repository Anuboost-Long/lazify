import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import type { HttpMethod } from "../types";
import { MethodBadge } from "./MethodBadge";

export interface RequestTabView {
  key: string;
  method: HttpMethod;
  label: string;
}

interface RequestTabBarProps {
  tabs: RequestTabView[];
  activeKey: string | null;
  unsaved: boolean;
  onActivate: (key: string) => void;
  onClose: (key: string) => void;
  onCloseAll: () => void;
}

export function RequestTabBar({
  tabs,
  activeKey,
  unsaved,
  onActivate,
  onClose,
  onCloseAll
}: Readonly<RequestTabBarProps>) {
  const { t } = useTranslation();

  if (tabs.length === 0) return null;

  return (
    <div className="flex shrink-0 items-stretch border-b border-border">
      <div role="tablist" className="flex min-w-0 flex-1 items-stretch gap-0.5 overflow-x-auto px-1">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;

        return (
          <div
            key={tab.key}
            className={clsx(
              "group/tab flex shrink-0 items-center gap-1 border-b-2 px-2",
              active ? "border-accent bg-text/[0.03]" : "border-transparent"
            )}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onActivate(tab.key)}
              className="flex min-w-0 items-center gap-1.5 py-2"
            >
              <MethodBadge method={tab.method} />
              <span
                className={clsx(
                  "max-w-[9rem] truncate text-[11px]",
                  active ? "text-text" : "text-muted"
                )}
              >
                {tab.label}
              </span>
              {active && unsaved ? (
                <span
                  aria-label={t(translation.ApiStudio.UnsavedChanges)}
                  className="size-1.5 shrink-0 rounded-full bg-accent"
                />
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => onClose(tab.key)}
              aria-label={t(translation.ApiStudio.CloseTab)}
              className={clsx(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted",
                "transition-colors hover:bg-text/[0.08] hover:text-text",
                active ? null : "opacity-0 group-hover/tab:opacity-100 focus:opacity-100"
              )}
            >
              <UiIcon name="xmark" className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      </div>

      <button
        type="button"
        onClick={onCloseAll}
        title={t(translation.ApiStudio.CloseAllTabs)}
        aria-label={t(translation.ApiStudio.CloseAllTabs)}
        className={clsx(
          "flex w-9 shrink-0 items-center justify-center border-l border-border",
          "text-muted transition-colors hover:bg-text/[0.04] hover:text-text"
        )}
      >
        <UiIcon name="collapse" className="h-4 w-4" />
      </button>
    </div>
  );
}
