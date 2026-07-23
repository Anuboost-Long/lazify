import clsx from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";

import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

export interface TabItem<T extends string> {
  key: T;
  /** Already translated by the caller. */
  label: string;
  icon?: UiIconName;
  /** Status shown on the tab itself, so a section can be read without opening it. */
  badge?: ReactNode;
}

interface TabBarProps<T extends string> {
  tabs: TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
}

/**
 * Contained tab bar with a sliding active indicator, generic over the tab key
 * so any panel switcher can use it. Pairs with {@link TabPanel}.
 */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  className
}: Readonly<TabBarProps<T>>) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const updateIndicator = () => {
      const node = tabRefs.current[value];

      if (node) setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
    };

    updateIndicator();
    globalThis.addEventListener("resize", updateIndicator);

    return () => globalThis.removeEventListener("resize", updateIndicator);
  }, [value, tabs]);

  return (
    <div
      className={clsx(
        "relative isolate flex overflow-x-auto",
        "rounded-[18px] border border-border bg-soft p-1.5",
        className
      )}
    >
      <span
        className={clsx(
          "absolute top-1/2 z-0 h-[38px] -translate-y-1/2",
          "rounded-[14px] border border-accent/40 bg-accent/12",
          "transition-all duration-300 ease-out"
        )}
        style={{ left: indicator.left, width: indicator.width }}
      />

      {tabs.map((tab) => {
        const isActive = tab.key === value;

        return (
          <button
            key={tab.key}
            ref={(node) => {
              tabRefs.current[tab.key] = node;
            }}
            type="button"
            onClick={() => onChange(tab.key)}
            className={clsx(
              "relative z-10 flex min-h-[38px] shrink-0 items-center gap-2 whitespace-nowrap",
              "rounded-[14px] px-3 py-2 text-[12px] font-semibold",
              "transition-colors duration-200",
              isActive ? "text-accent" : "text-muted hover:bg-bg/60 hover:text-text"
            )}
          >
            {tab.icon ? (
              <UiIcon
                name={tab.icon}
                className={clsx("h-3.5 w-3.5 shrink-0", isActive ? "text-accent" : "text-muted")}
              />
            ) : null}
            {tab.label}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The body below a {@link TabBar}. Keyed on the active tab so the app's own
 * fade-in replays on every switch — no animation library, and the reduce-motion
 * setting already disables it globally.
 */
export function TabPanel({
  activeKey,
  children,
  className
}: Readonly<{ activeKey: string; children: ReactNode; className?: string }>) {
  return (
    <div key={activeKey} className={clsx("animate-fadeIn opacity-0", className)}>
      {children}
    </div>
  );
}
