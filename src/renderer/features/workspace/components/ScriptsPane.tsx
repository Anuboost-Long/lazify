import { translation } from "@renderer/i18n/translation";
import type { ScriptStatusEvent } from "@renderer/shared/types/lazify";
import { MonoText, PillText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { LabelButton } from "@renderer/shared/ui/LabelButton";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useProjectScripts,
  type ScriptTab as Tab,
} from "../hooks/use-project-scripts";
import { XTermPanel } from "./XTermPanel";

const TERM_HEIGHT_KEY = "lazify-terminal-height";
const MIN_TERM_HEIGHT = 160;
const MAX_TERM_HEIGHT = 900;
const DEFAULT_TERM_HEIGHT = 384;

// Always assign the lowest available terminal number (fills gaps after closes)
function nextTabIndex(tabs: Tab[]): number {
  const used = new Set(tabs.map((t) => t.index));
  let i = 1;
  while (used.has(i)) i++;
  return i;
}

interface ScriptsPaneProps {
  projectPath: string;
}

// ─── Script row ───────────────────────────────────────────────────────────────

interface ScriptRowProps {
  name: string;
  command: string;
  isRunningHere: boolean; // this script is the one running in the active tab
  isDisabled: boolean; // active tab is busy with a different script
  onRun: () => void;
  onStop: () => void;
  onRestart: () => void;
}

function ScriptRow({
  name,
  command,
  isRunningHere,
  isDisabled,
  onRun,
  onStop,
  onRestart,
}: ScriptRowProps) {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        "group relative w-full overflow-hidden rounded-2xl border",
        "border-black/[0.06] dark:border-white/[0.04] bg-soft"
      )}
    >
      {isRunningHere && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px animate-pulseLine"
          style={{
            background:
              "linear-gradient(to right, transparent, var(--color-accent), transparent)",
          }}
        />
      )}
      <div
        className={clsx(
          "pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r-full transition-colors duration-300",
          isRunningHere ? "bg-accent" : "bg-border/30 group-hover:bg-border/60"
        )}
      />

      <div className="flex items-center gap-3 px-4 py-3 pl-5">
        <div
          className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200",
            "border-black/[0.06] dark:border-white/[0.04]",
            isRunningHere ? "bg-accent/10 text-accent" : "bg-bg text-muted"
          )}
        >
          {isRunningHere ? (
            <UiIcon
              name="refresh-circle"
              className="h-3.5 w-3.5 animate-spin"
            />
          ) : (
            <UiIcon name="play" className="h-3.5 w-3.5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <MonoText
            as="span"
            className="block text-[13px] font-semibold leading-tight text-text"
          >
            {name}
          </MonoText>
          <MonoText
            as="span"
            className="mt-0.5 block truncate text-[11px] leading-tight text-muted"
          >
            {command}
          </MonoText>
        </div>

        {isRunningHere && (
          <PillText
            as="span"
            className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-accent"
          >
            {t(translation.ScriptsPane.Running)}
          </PillText>
        )}

        {isRunningHere ? (
          <>
            <LabelButton
              label={translation.ScriptsPane.Restart}
              icon="refresh-circle"
              variant="accent"
              onClick={onRestart}
            />
            <LabelButton
              label={translation.ScriptsPane.Stop}
              icon="stop-circle"
              variant="error"
              onClick={onStop}
            />
          </>
        ) : (
          <LabelButton
            label={translation.ScriptsPane.Run}
            icon="play"
            variant="accent"
            disabled={isDisabled}
            onClick={onRun}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main pane ────────────────────────────────────────────────────────────────

export function ScriptsPane({ projectPath }: ScriptsPaneProps) {
  const { t } = useTranslation();

  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tab layout lives outside the component (keyed by project) so leaving this
  // page and returning does not forget scripts that are still running.
  const { tabs, setTabs, activeTabId, setActiveTabId } =
    useProjectScripts(projectPath);

  const unsubMapRef = useRef<Map<string, () => void>>(new Map());
  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  // ── Terminal resize ──────────────────────────────────────────────────────────
  const [termHeight, setTermHeight] = useState<number>(() => {
    const stored = Number(localStorage.getItem(TERM_HEIGHT_KEY));
    return stored >= MIN_TERM_HEIGHT
      ? Math.min(stored, MAX_TERM_HEIGHT)
      : DEFAULT_TERM_HEIGHT;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ y: number; h: number } | null>(null);
  const termHeightRef = useRef(termHeight);
  useEffect(() => {
    termHeightRef.current = termHeight;
  }, [termHeight]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { y: e.clientY, h: termHeightRef.current };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      setTermHeight(
        Math.min(
          MAX_TERM_HEIGHT,
          Math.max(
            MIN_TERM_HEIGHT,
            dragStartRef.current.h + (e.clientY - dragStartRef.current.y)
          )
        )
      );
    };
    const onUp = () => {
      setIsDragging(false);
      localStorage.setItem(TERM_HEIGHT_KEY, String(termHeightRef.current));
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "ns-resize";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
  }, [isDragging]);
  // ────────────────────────────────────────────────────────────────────────────

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

  const subscribeStatus = (runId: string, tabId: string) => {
    const stopStatus = globalThis.lazify.onScriptStatus(
      (event: ScriptStatusEvent) => {
        if (event.runId !== runId) return;
        if (event.status === "done" || event.status === "error") {
          setTabs((prev) =>
            prev.map((tab) =>
              tab.tabId === tabId
                ? { ...tab, status: event.status as "done" | "error" }
                : tab
            )
          );
          unsubMapRef.current.get(runId)?.();
          unsubMapRef.current.delete(runId);
        }
      }
    );
    unsubMapRef.current.set(runId, stopStatus);
  };

  // On (re)mount, reconcile persisted tabs with the sessions still alive in the
  // main process: re-attach status listeners to runs that are still going, and
  // mark as finished any that exited while this pane was unmounted.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let sessions;
      try {
        sessions = await globalThis.lazify.listSessions();
      } catch {
        return;
      }
      if (cancelled) return;

      const live = new Set(
        sessions
          .filter((session) => session.projectPath === projectPath)
          .map((session) => session.runId)
      );

      tabsRef.current.forEach((tab) => {
        if (
          tab.runId &&
          tab.status === "running" &&
          live.has(tab.runId) &&
          !unsubMapRef.current.has(tab.runId)
        ) {
          subscribeStatus(tab.runId, tab.tabId);
        }
      });

      const hasVanished = tabsRef.current.some(
        (tab) =>
          tab.runId &&
          (tab.status === "running" || tab.status === "pending") &&
          !live.has(tab.runId)
      );
      if (hasVanished) {
        setTabs((prev) =>
          prev.map((tab) =>
            tab.runId &&
            (tab.status === "running" || tab.status === "pending") &&
            !live.has(tab.runId)
              ? { ...tab, status: "done" }
              : tab
          )
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const handleAddTab = () => {
    const tabId = `tab-${Date.now()}`;
    setTabs((prev) => {
      const index = nextTabIndex(prev);
      return [
        ...prev,
        { tabId, index, runId: null, scriptName: null, status: "idle" },
      ];
    });
    setActiveTabId(tabId);
  };

  const handleRun = async (scriptName: string, restartRunId?: string) => {
    // Capture the target tab at call time — user may switch tabs during the await
    const targetTabId = activeTabId;
    const tab = tabs.find((t) => t.tabId === targetTabId);
    // A restart is the one case where launching over a running tab is intended.
    if (!tab || (!restartRunId && (tab.status === "running" || tab.status === "pending"))) return;

    setTabs((prev) =>
      prev.map((t) =>
        t.tabId === targetTabId
          ? { ...t, runId: "", scriptName, status: "pending" }
          : t
      )
    );

    const container = document.querySelector<HTMLElement>(
      "[data-pty-container]"
    );
    const cols = container ? Math.floor(container.clientWidth / 7.5) : 220;
    const rows = container ? Math.floor(container.clientHeight / 17) : 50;

    try {
      const { runId } = restartRunId
        ? await globalThis.lazify.restartScript(
            restartRunId,
            projectPath,
            scriptName,
            Math.max(cols, 40),
            Math.max(rows, 10)
          )
        : await globalThis.lazify.runScript(
            projectPath,
            scriptName,
            Math.max(cols, 40),
            Math.max(rows, 10)
          );
      setTabs((prev) =>
        prev.map((t) =>
          t.tabId === targetTabId ? { ...t, runId, status: "running" } : t
        )
      );
      subscribeStatus(runId, targetTabId);
    } catch {
      setTabs((prev) =>
        prev.map((t) =>
          t.tabId === targetTabId ? { ...t, status: "error" } : t
        )
      );
    }
  };

  /**
   * The old run's status subscription is dropped first, so its exit event
   * cannot mark the tab failed after the replacement has already started.
   */
  const handleRestart = async (scriptName: string) => {
    const tab = tabs.find((t) => t.tabId === activeTabId);
    if (!tab?.runId) return;

    unsubMapRef.current.get(tab.runId)?.();
    unsubMapRef.current.delete(tab.runId);

    await handleRun(scriptName, tab.runId);
  };

  const handleStop = async () => {
    const tab = tabs.find((t) => t.tabId === activeTabId);
    if (!tab?.runId) return;
    await globalThis.lazify.stopScript(tab.runId);
    unsubMapRef.current.get(tab.runId)?.();
    unsubMapRef.current.delete(tab.runId);
    setTabs((prev) =>
      prev.map((t) => (t.tabId === activeTabId ? { ...t, status: "error" } : t))
    );
  };

  const handleCloseTab = (tabId: string) => {
    const tab = tabs.find((t) => t.tabId === tabId);
    if (tab?.status === "running" && tab.runId) {
      void globalThis.lazify.stopScript(tab.runId);
      unsubMapRef.current.get(tab.runId)?.();
      unsubMapRef.current.delete(tab.runId);
    }

    const remaining = tabs.filter((t) => t.tabId !== tabId);

    if (remaining.length === 0) {
      // Always keep at least one tab — auto-create a fresh one starting from index 1
      const newTabId = `tab-${Date.now()}`;
      setTabs([
        {
          tabId: newTabId,
          index: 1,
          runId: null,
          scriptName: null,
          status: "idle",
        },
      ]);
      setActiveTabId(newTabId);
    } else {
      setTabs(remaining);
      if (activeTabId === tabId) {
        setActiveTabId(remaining[remaining.length - 1].tabId);
      }
    }
  };

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      unsubMapRef.current.forEach((unsub) => unsub());
      unsubMapRef.current.clear();
    };
  }, []);

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
          {/* ── Tab bar ── */}
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
                      onClick={() => setActiveTabId(tab.tabId)}
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
                      onClick={() => handleCloseTab(tab.tabId)}
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
                onClick={handleAddTab}
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

          {/* ── Terminal bodies — all mounted, active tab visible ── */}
          <div
            data-pty-container
            className="bg-soft"
            style={{ height: termHeight }}
          >
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
                      <UiIcon
                        name="terminal"
                        className="h-5 w-5 text-muted/40"
                      />
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

          {/* ── Drag handle ── */}
          <div
            onMouseDown={handleDragStart}
            className={clsx(
              "flex h-[11px] cursor-ns-resize select-none items-center justify-center",
              "border-t border-border bg-soft",
              isDragging ? "bg-accent/20" : "hover:bg-text/[0.04]",
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
