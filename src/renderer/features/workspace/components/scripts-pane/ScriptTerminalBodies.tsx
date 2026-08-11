import { translation } from "@renderer/i18n/translation";
import type { ScriptTab as Tab } from "@renderer/features/workspace/hooks/use-project-scripts";
import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { MonoText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { useTranslation } from "react-i18next";

interface ScriptTerminalBodiesProps {
  tabs: Tab[];
  activeTabId: string;
  height: number;
}

/**
 * One body per tab, all mounted at once with the inactive ones hidden — a
 * terminal that was unmounted on every tab switch would lose its scrollback,
 * and the PTY behind it has no way to send that output twice.
 */
export function ScriptTerminalBodies({
  tabs,
  activeTabId,
  height,
}: Readonly<ScriptTerminalBodiesProps>) {
  const { t } = useTranslation();

  return (
    <div data-pty-container className="bg-soft" style={{ height }}>
      {tabs.map((tab) => {
        const isVisible = tab.tabId === activeTabId;
        return (
          <div
            key={tab.tabId}
            className="h-full w-full"
            style={{ display: isVisible ? "block" : "none" }}
          >
            {/* Idle placeholder */}
            {tab.status === "idle" && (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <UiIcon name="terminal" className="h-5 w-5 text-muted/40" />
                <MonoText as="p" className="text-[11px] text-muted">
                  Select a script above to run it here
                </MonoText>
              </div>
            )}

            {/* Pending — PTY is starting */}
            {tab.status === "pending" && (
              <div className="flex h-full items-center justify-center gap-2">
                <UiIcon
                  name="refresh-circle"
                  className="h-3.5 w-3.5 animate-spin text-accent/60"
                />
                <MonoText as="span" className="text-[12px] text-muted">
                  Starting…
                </MonoText>
              </div>
            )}

            {/* Finished, and its transcript went with the session — the run
                ended while the pane was away from the screen. */}
            {!tab.runId && tab.status !== "idle" && tab.status !== "pending" && (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <UiIcon name="check-circle" className="h-5 w-5 text-muted/40" />
                <MonoText as="p" className="text-[11px] text-muted">
                  {t(translation.ScriptsPane.SessionEnded)}
                </MonoText>
              </div>
            )}

            {/* Live terminal — kept mounted while runId is present */}
            {tab.runId && tab.status !== "pending" && (
              <div className="h-full w-full p-1">
                <XTermPanel
                  key={tab.runId}
                  runId={tab.runId}
                  isActive={isVisible}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
