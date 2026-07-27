import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import { AgentChangesPanel } from "../components/AgentChangesPanel";
import { AgentFilesPanel } from "../components/AgentFilesPanel";
import { AgentUsagePanel } from "../components/AgentUsagePanel";
import { AgentEmptyState } from "../components/AgentEmptyState";
import { AgentNoProjectState } from "../components/AgentNoProjectState";
import { AgentProjectPicker } from "../components/AgentProjectPicker";
import { AgentTabBar, type AgentRailTab } from "../components/AgentTabBar";
import { AgentDebugPanel } from "../components/AgentDebugPanel";
import { AgentPreviewPanel } from "../components/AgentPreviewPanel";
import { useAgentChanges } from "../hooks/use-agent-changes";
import { useAgentUsage } from "../hooks/use-agent-usage";
import { usePreviewUrl } from "../hooks/use-preview-url";
import { useAgentTerminals } from "../hooks/use-agent-terminals";

/**
 * Tab id the preview answers to. It is not a PTY, so it never enters the
 * terminal list — the active-tab slot simply points at it instead.
 */
const PREVIEW_TAB_ID = "agent-tab-preview";

interface AgentsPageProps {
  projects: SyncedWorkspaceProject[];
  /** Opens the folder picker and syncs whatever the user chooses. */
  onSyncProject: (
    projectPath?: string | null,
  ) => Promise<SyncedWorkspaceProject | null>;
  /** Persists a new card order after a drag in the project rail. */
  onReorderProjects: (fromProjectPath: string, toProjectPath: string) => void;
  /** The project the user last had open, restored across navigation. */
  activeProjectPath: string;
  /** Persists the newly selected project so it survives leaving the page. */
  onActiveProjectChange: (projectPath: string) => void;
}

export function AgentsPage({
  projects,
  onSyncProject,
  onReorderProjects,
  activeProjectPath,
  onActiveProjectChange,
}: Readonly<AgentsPageProps>) {
  const { t } = useTranslation();
  // Restore the remembered project when it still exists, otherwise fall back to
  // the first one. The selection itself lives in the store, so navigating away
  // and back lands on the same project.
  const projectPath =
    projects.some((project) => project.projectPath === activeProjectPath)
      ? activeProjectPath
      : projects[0]?.projectPath ?? "";
  const setProjectPath = onActiveProjectChange;
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  /** Latest permission prompt, shown as a toast until dismissed. */
  const [attention, setAttention] = useState<{
    projectName: string;
    agentLabel: string;
  } | null>(null);
  // One rail, two tabs: clicking the open tab's button closes it again.
  const [railTab, setRailTab] = useState<AgentRailTab | null>(null);
  // Whether the preview has a tab in the strip. Cleared only by that tab's
  // close button: the panel outlives switching to a terminal, so coming back
  // does not reload the page the user was looking at.
  const [previewOpen, setPreviewOpen] = useState(false);
  const { sessionChanges, loading, refresh, resetBaseline } = useAgentChanges(
    projectPath,
    railTab === "changes",
  );
  const {
    availableAgents,
    openAgentIds,
    runningCountByProject,
    waitingByProject,
    waitingTabIds,
    terminals,
    activeTerminal,
    activeTabId,
    runnableScript,
    allScripts,
    setRunnableScript,
    scriptTerminal,
    setActiveTab,
    openTerminal,
    runProject,
    restartProject,
    stopProject,
    closeTerminal,
    reorderTerminal,
    createAgent,
    deleteAgent,
  } = useAgentTerminals(projectPath);
  const isScriptRunning = Boolean(scriptTerminal) && !scriptTerminal?.exited;
  /** True while the preview tab — rather than a terminal — is on screen. */
  const previewActive = previewOpen && activeTabId === PREVIEW_TAB_ID;
  // Watched while the preview exists rather than while it is showing, so a
  // server that restarts onto a new port behind a hidden panel is already
  // followed by the time the user switches back. A closed panel costs no scans.
  const detectedPreviewUrl = usePreviewUrl(
    previewOpen ? scriptTerminal?.runId ?? null : null,
    isScriptRunning,
  );
  // Only the agents with a tab open get scanned; nothing open means everything.
  const {
    report: usageReport,
    loading: usageLoading,
    refresh: refreshUsage,
    setBudget,
  } = useAgentUsage(railTab === "usage", openAgentIds);

  /**
   * Types a path straight into the running agent instead of into the shell, so
   * the user can point at a component mid-conversation. No newline: it is the
   * user's to send once they have finished the sentence around it.
   */
  const activeRunId = activeTerminal?.runId ?? null;
  const sendToTerminal = activeRunId
    ? (text: string) => globalThis.lazify.ptyWrite(activeRunId, text)
    : null;

  // Raises the in-app alert. The badge on the project card persists after the
  // toast auto-dismisses, so nothing is lost by missing it.
  useEffect(() => {
    return globalThis.lazify.onAgentAttention((event) => {
      if (!event.waiting) return;

      setAttention({ projectName: event.projectName, agentLabel: event.agentLabel });
    });
  }, []);

  /** Terminal tab to land back on once the preview tab is closed. */
  const previousTabIdRef = useRef<string | null>(null);

  /** Shows the preview tab, creating it the first time it is asked for. */
  const openPreview = () => {
    if (activeTabId && activeTabId !== PREVIEW_TAB_ID) {
      previousTabIdRef.current = activeTabId;
    }

    setPreviewOpen(true);
    setActiveTab(PREVIEW_TAB_ID);
  };

  /** Closes the tab, which unmounts the guest and drops its page. */
  const closePreview = () => {
    setPreviewOpen(false);
    if (activeTabId !== PREVIEW_TAB_ID) return;

    // Back to whatever the user was reading before, while it still exists.
    const fallback =
      terminals.find(
        (terminal) => terminal.tabId === previousTabIdRef.current,
      ) ?? terminals[0];
    setActiveTab(fallback?.tabId ?? null);
  };

  /** Syncs from here, then selects the new project so agents can open in it. */
  const handleSyncProject = async () => {
    try {
      setSyncError(null);
      setSyncing(true);

      const synced = await onSyncProject();
      // Null when the user dismissed the folder picker.
      if (synced) setProjectPath(synced.projectPath);
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : t(translation.Workspace.SyncError),
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-0 flex-col gap-6">
      {/* Syncing is reachable from both branches, so the error is shown once here. */}
      {syncError ? (
        <Toast
          title={t(translation.Workspace.AlreadySynced)}
          message={syncError}
          onClose={() => setSyncError(null)}
        />
      ) : null}

      {attention ? (
        <Toast
          title={t(translation.Agents.NeedsAttention)}
          message={t(translation.Agents.NeedsAttentionToast, {
            agent: attention.agentLabel,
            project: attention.projectName,
          })}
          onClose={() => setAttention(null)}
        />
      ) : null}

      {projects.length === 0 ? (
        /* Saves a trip to the workspace page just to get started here. */
        <AgentNoProjectState
          agents={availableAgents}
          syncing={syncing}
          onSync={() => void handleSyncProject()}
        />
      ) : (
        <div
          className={clsx(
            // Fills whatever the header leaves, so the page never scrolls —
            // only the project rail and the terminal do.
            "flex min-h-0 flex-1 flex-col gap-4 lg:flex-row",
          )}
        >
          <AgentProjectPicker
            projects={projects}
            selectedPath={projectPath}
            runningCounts={runningCountByProject}
            waitingCounts={waitingByProject}
            onSelect={setProjectPath}
            onReorder={onReorderProjects}
            syncing={syncing}
            onSync={() => void handleSyncProject()}
          />

          <div
            className={clsx(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              "rounded-2xl border border-border bg-soft",
            )}
          >
            <AgentTabBar
              terminals={terminals}
              activeTabId={activeTabId}
              availableAgents={availableAgents}
              runnableScript={runnableScript}
              allScripts={allScripts}
              onSelectScript={setRunnableScript}
              isScriptRunning={isScriptRunning}
              showDebug={Boolean(scriptTerminal)}
              waitingTabIds={waitingTabIds}
              changeCount={sessionChanges.length}
              railTab={railTab}
              onToggleRail={(tab) => {
                setRailTab((current) => (current === tab ? null : tab));
              }}
              previewOpen={previewOpen}
              previewActive={previewActive}
              onSelectPreview={openPreview}
              onClosePreview={closePreview}
              onSelect={setActiveTab}
              onClose={closeTerminal}
              onReorder={reorderTerminal}
              onOpen={openTerminal}
              onRun={runProject}
              onCreateAgent={createAgent}
              onDeleteAgent={deleteAgent}
            />

            {/* Terminal and the changes rail share the row below the tab bar.
                Positioned so the preview tab's page can fill it without being
                unmounted whenever another tab takes over. */}
            <div className="relative flex min-h-0 flex-1">
              {/* Hidden rather than unmounted while the preview tab is showing —
                  the terminals hold live PTYs and their own scrollback. */}
              <div
                className={clsx(
                  "relative min-h-0 min-w-0 flex-1",
                  previewActive && "hidden",
                )}
              >
              {activeTerminal ? null : <AgentEmptyState />}

              {/* Every terminal stays mounted so scrollback survives tab switches. */}
              {terminals.map((terminal) =>
                terminal.runId ? (
                  <div
                    key={terminal.tabId}
                    className="absolute inset-0 p-2"
                    style={{
                      display:
                        terminal.tabId === activeTabId ? "block" : "none",
                    }}
                  >
                    <XTermPanel
                      runId={terminal.runId}
                      isActive={terminal.tabId === activeTabId}
                      autoFocus
                    />
                  </div>
                ) : null,
              )}
              </div>

              {railTab === "debug" ? (
                <AgentDebugPanel
                  terminal={scriptTerminal}
                  runnableScript={runnableScript}
                  onStart={runProject}
                  onRestart={() => void restartProject()}
                  onStop={() => {
                    void stopProject().then((removed) => {
                      if (removed) setRailTab(null);
                    });
                  }}
                  onClose={() => setRailTab(null)}
                />
              ) : null}

              {railTab === "changes" ? (
                <AgentChangesPanel
                  projectPath={projectPath}
                  changes={sessionChanges}
                  loading={loading}
                  onRefresh={refresh}
                  onReset={resetBaseline}
                  onClose={() => setRailTab(null)}
                />
              ) : null}

              {railTab === "files" ? (
                <AgentFilesPanel
                  projectPath={projectPath}
                  onSendToTerminal={sendToTerminal}
                  onClose={() => setRailTab(null)}
                />
              ) : null}

              {/* Mounted for as long as its tab exists: switching to a terminal
                  only hides it, so the guest keeps its page rather than
                  reloading on every trip back. */}
              {previewOpen ? (
                <AgentPreviewPanel
                  detectedUrl={detectedPreviewUrl}
                  isRunning={isScriptRunning}
                  visible={previewActive}
                />
              ) : null}

              {railTab === "usage" ? (
                <AgentUsagePanel
                  report={usageReport}
                  loading={usageLoading}
                  onRefresh={refreshUsage}
                  onSetBudget={setBudget}
                  onClose={() => setRailTab(null)}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
