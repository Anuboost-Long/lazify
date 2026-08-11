import { translation } from "@renderer/i18n/translation";
import { MonoText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScriptRow } from "./scripts-pane/ScriptRow";
import { ScriptTerminalBodies } from "./scripts-pane/ScriptTerminalBodies";
import { ScriptTerminalTabs } from "./scripts-pane/ScriptTerminalTabs";
import { useScriptRuns } from "./scripts-pane/use-script-runs";
import { useTerminalHeight } from "./scripts-pane/use-terminal-height";

interface ScriptsPaneProps {
  projectPath: string;
}

export function ScriptsPane({ projectPath }: ScriptsPaneProps) {
  const { t } = useTranslation();

  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tab layout lives outside the component (keyed by project) so leaving this
  // page and returning does not forget scripts that are still running.
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    handleAddTab,
    handleRun,
    handleRestart,
    handleStop,
    handleCloseTab,
  } = useScriptRuns(projectPath);

  const terminal = useTerminalHeight();

  const loadScripts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await globalThis.lazify.listScripts(projectPath);
      setScripts(result);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : t(translation.ScriptsPane.LoadError)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScripts();
  }, [projectPath]);

  // ── Derived state ────────────────────────────────────────────────────────────

  const scriptEntries = Object.entries(scripts);
  const activeTab = tabs.find((t) => t.tabId === activeTabId);
  const isActiveTabBusy =
    activeTab?.status === "running" || activeTab?.status === "pending";
  const runningCount = tabs.filter((t) => t.status === "running").length;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-end gap-2 border-b border-border bg-soft px-4 py-2">
        <div className="flex items-center gap-2">
          {!loading && scriptEntries.length > 0 && (
            <PillText
              as="span"
              className="rounded-full border border-border bg-bg px-2.5 py-1 text-[10px] text-muted"
            >
              {t(translation.ScriptsPane.ScriptsCount, {
                count: scriptEntries.length,
              })}
            </PillText>
          )}
          {runningCount > 0 && (
            <PillText
              as="span"
              className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] text-accent"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
              {t(translation.ScriptsPane.RunningCount, { count: runningCount })}
            </PillText>
          )}
          <LabelButton
            label={
              loading
                ? translation.GlobalTerm.Scanning
                : translation.GlobalTerm.Refresh
            }
            loading={loading}
            disabled={loading}
            onClick={() => void loadScripts()}
          />
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
            <UiIcon
              name="refresh-circle"
              className="h-4 w-4 animate-spin text-accent"
            />
            {t(translation.ScriptsPane.Loading)}
          </div>
        )}

        {/* ── Load error ── */}
        {!loading && loadError && (
          <div className="rounded-2xl border border-border bg-soft/40 px-4 py-3 text-sm text-muted">
            {loadError}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && !loadError && scriptEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-soft text-muted">
              <UiIcon name="terminal" className="h-6 w-6" />
            </div>
            <MonoText as="p" className="mt-4 text-sm font-semibold text-text">
              {t(translation.ScriptsPane.Empty)}
            </MonoText>
          </div>
        )}

        {/* ── Script list ── */}
        {!loading && !loadError && scriptEntries.length > 0 && (
          <div className="grid gap-1.5">
            {scriptEntries.map(([name, command]) => (
              <ScriptRow
                key={name}
                name={name}
                command={command}
                isRunningHere={
                  isActiveTabBusy && activeTab?.scriptName === name
                }
                isDisabled={isActiveTabBusy && activeTab?.scriptName !== name}
                onRun={() => void handleRun(name)}
                onStop={() => void handleStop()}
                onRestart={() => void handleRestart(name)}
              />
            ))}
          </div>
        )}

        {/* ── Terminal panel — always visible, tabs separate from script runs ── */}
        <div className="overflow-hidden rounded-[20px] border border-black/[0.06] dark:border-white/[0.04]">
          <ScriptTerminalTabs
            tabs={tabs}
            activeTabId={activeTabId}
            onSelect={setActiveTabId}
            onClose={handleCloseTab}
            onAdd={handleAddTab}
          />

          <ScriptTerminalBodies
            tabs={tabs}
            activeTabId={activeTabId}
            height={terminal.height}
          />

          {/* ── Drag handle ── */}
          <div
            onMouseDown={terminal.onDragStart}
            className={clsx(
              "flex h-[11px] cursor-ns-resize select-none items-center justify-center",
              "border-t border-border bg-soft",
              terminal.isDragging ? "bg-accent/20" : "hover:bg-text/[0.04]",
              "transition-colors duration-100"
            )}
          >
            <div className="h-px w-8 rounded-full bg-text/25" />
          </div>
        </div>
      </div>
    </div>
  );
}
