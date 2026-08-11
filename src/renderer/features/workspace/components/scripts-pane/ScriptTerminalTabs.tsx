import { translation } from "@renderer/i18n/translation";
import type { ScriptTab as Tab } from "@renderer/features/workspace/hooks/use-project-scripts";
import { MonoText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

interface ScriptTerminalTabsProps {
  tabs: Tab[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onAdd: () => void;
}

/** The tab strip above the terminal bodies: one per terminal, plus "New". */
export function ScriptTerminalTabs({
  tabs,
  activeTabId,
  onSelect,
  onClose,
  onAdd,
}: Readonly<ScriptTerminalTabsProps>) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center border-b border-border bg-soft">
      <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-2 py-1.5 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = tab.tabId === activeTabId;
          const label = tab.scriptName ?? `Terminal ${tab.index}`;
          return (
            <div
              key={tab.tabId}
              className={clsx(
                "flex shrink-0 items-center rounded-lg text-text transition-colors",
                isActive ? "bg-text/[0.10]" : "hover:bg-text/[0.06]"
              )}
            >
              {/* Tab label — click to select */}
              <button
                type="button"
                onClick={() => onSelect(tab.tabId)}
                className="flex items-center gap-1.5 py-1.5 pl-2.5 pr-1"
              >
                {tab.status === "idle" && (
                  <UiIcon name="terminal" className="h-2.5 w-2.5" />
                )}
                {tab.status === "pending" && (
                  <UiIcon
                    name="refresh-circle"
                    className="h-2.5 w-2.5 animate-spin"
                  />
                )}
                {tab.status === "running" && (
                  <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" />
                )}
                {tab.status === "done" && (
                  <UiIcon
                    name="check-circle"
                    className="h-2.5 w-2.5 text-success"
                  />
                )}
                {tab.status === "error" && (
                  <UiIcon
                    name="warning-triangle"
                    className="h-2.5 w-2.5 text-error"
                  />
                )}
                <MonoText
                  as="span"
                  className="text-[11px] font-medium !text-text"
                >
                  {label}
                </MonoText>
              </button>

              {/* Close / kill button */}
              <IconButton
                icon={tab.status === "running" ? "stop-circle" : "xmark"}
                onClick={() => onClose(tab.tabId)}
                title={
                  tab.status === "running"
                    ? t(translation.ScriptsPane.Stop)
                    : t(translation.GlobalTerm.Close)
                }
                className={clsx(
                  "mr-1 hover:bg-text/15",
                  tab.status === "running"
                    ? "text-error hover:text-error"
                    : "text-text hover:text-text"
                )}
                iconClassName="h-2.5 w-2.5"
              />
            </div>
          );
        })}
      </div>

      {/* New tab button */}
      <Tooltip content="New terminal tab" side="top">
        <button
          type="button"
          onClick={onAdd}
          className={clsx(
            "mx-2 shrink-0 flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors",
            "border-border bg-text/[0.08] text-text",
            "hover:border-accent/50 hover:bg-accent/15 hover:text-accent"
          )}
        >
          <UiIcon name="plus" className="h-3 w-3" />
          <span>New</span>
        </button>
      </Tooltip>
    </div>
  );
}
