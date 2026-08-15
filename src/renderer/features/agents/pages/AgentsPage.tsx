import clsx from "clsx";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import type {
  CodeSelectionAction,
  CodeSelectionContext,
} from "@renderer/shared/ui/code/menu/code-selection";
import { CodeSelectionActionsProvider } from "@renderer/shared/ui/code/menu/selection-actions";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import { AgentFileModal } from "../components/AgentFileModal";
import { AgentRailPanels } from "../components/AgentRailPanels";
import { AgentTerminalStack } from "../components/AgentTerminalStack";
import { AgentNoProjectState } from "../components/AgentNoProjectState";
import { AgentProjectPicker } from "../components/project-picker";
import { AgentTabBar, type AgentRailTab } from "../components/AgentTabBar";
import { AgentToolRail } from "../components/AgentToolRail";
import { AgentMonitorGrid } from "../components/AgentMonitorGrid";
import { AgentMonitorRail } from "../components/AgentMonitorRail";
import { SendToAgentDialog } from "../components/send-to-agent";
import { useAgentActivity } from "../hooks/use-agent-activity";
import { useAgentBranch } from "../hooks/use-agent-branch";
import { useAgentChanges } from "../hooks/use-agent-changes";
import { useAgentUsage } from "../hooks/use-agent-usage";
import { useAutopilot } from "../hooks/use-autopilot";
import { usePreviewUrl } from "../hooks/use-preview-url";
import { useAgentTerminals, useFocusAgentRun } from "../hooks/agent-terminals";
import { revealRunIdAtom } from "../hooks/agent-terminals/terminal-store";
import { useMonitorPanels } from "../hooks/use-monitor-panels";
import { useTerminalLinks } from "../hooks/use-terminal-links";
import {
  formatPickedPathsForTerminal,
  resolveAgentProjectPath,
} from "../utils/paths";

const PREVIEW_TAB_ID = "agent-tab-preview";

interface AgentsPageProps {
  projects: SyncedWorkspaceProject[];

  onSyncProject: (
    projectPath?: string | null,
  ) => Promise<SyncedWorkspaceProject | null>;

  onReorderProjects: (fromProjectPath: string, toProjectPath: string) => void;

  activeProjectPath: string;

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

  const projectPath = resolveAgentProjectPath(projects, activeProjectPath);
  const setProjectPath = onActiveProjectChange;
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [attention, setAttention] = useState<{
    projectName: string;
    agentLabel: string;
  } | null>(null);

  const [railTab, setRailTab] = useState<AgentRailTab | null>(null);

  const monitorPanels = useMonitorPanels();

  const { monitorMode, setMonitorMode } = monitorPanels;

  const [previewOpen, setPreviewOpen] = useState(false);

  const railProjectPath = monitorMode
    ? (monitorPanels.target?.projectPath ?? "")
    : projectPath;
  const { sessionChanges, loading, refresh, resetBaseline } = useAgentChanges(
    railProjectPath,
    railTab === "changes",
  );

  const {
    entries: activityEntries,
    unreadCount: activityUnread,
    markRead: markActivityRead,
    clear: clearActivity,
  } = useAgentActivity();

  const autopilot = useAutopilot(projectPath);

  const { status: gitStatus, refresh: refreshBranch } = useAgentBranch(projectPath);
  const focusAgentRun = useFocusAgentRun();
  const [revealRunId, setRevealRunId] = useAtom(revealRunIdAtom);
  const terminalLinks = useTerminalLinks(projectPath);
  const {
    availableAgents,
    openAgentIds,
    runningCountByProject,
    tabCountByProject,
    waitingByProject,
    waitingTabIds,
    waitingByRunId,
    syncSessions,
    terminals,
    allTerminals,
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
    closeProjectTerminals,
    reorderTerminal,
    createAgent,
    deleteAgent,
  } = useAgentTerminals(projectPath);

  const syncMonitor = monitorPanels.sync;
  useEffect(() => {
    void (monitorMode ? syncMonitor() : syncSessions());
  }, [monitorMode, syncMonitor, syncSessions]);

  const setMonitorTarget = monitorPanels.setTarget;
  useEffect(() => {
    if (!revealRunId) return;

    if (monitorMode) {
      setMonitorTarget(revealRunId);
      setRevealRunId(null);
      return;
    }

    const terminal = allTerminals.find((candidate) => candidate.runId === revealRunId);
    if (!terminal) return;

    setProjectPath(terminal.projectPath);
    focusAgentRun(revealRunId);
    setRevealRunId(null);
  }, [
    revealRunId,
    monitorMode,
    allTerminals,
    focusAgentRun,
    setMonitorTarget,
    setProjectPath,
    setRevealRunId,
  ]);

  const isScriptRunning = Boolean(scriptTerminal) && !scriptTerminal?.exited;

  const previewActive = previewOpen && activeTabId === PREVIEW_TAB_ID;

  const detectedPreviewUrl = usePreviewUrl(
    previewOpen ? scriptTerminal?.runId ?? null : null,
    isScriptRunning,
  );

  const {
    report: usageReport,
    loading: usageLoading,
    refresh: refreshUsage,
    setBudget,
  } = useAgentUsage(railTab === "usage", openAgentIds);

  const activeRunId = monitorMode
    ? (monitorPanels.target?.runId ?? null)
    : (activeTerminal?.runId ?? null);
  const sendToTerminal = activeRunId
    ? (text: string) => globalThis.lazify.ptyWrite(activeRunId, text)
    : null;

  const [sendingSelection, setSendingSelection] = useState<CodeSelectionContext | null>(
    null,
  );

  const codeSelectionActions: CodeSelectionAction[] = [
    {
      id: "send-to-agent",
      label: t(translation.Agents.SendSelectionToAgent),
      icon: "chat-question",
      onSelect: setSendingSelection,
    },
  ];

  const pickPathForTerminal = async () => {
    if (!sendToTerminal) return;

    const picked = await globalThis.lazify.selectPaths(railProjectPath || null);
    if (picked.length === 0) return;

    sendToTerminal(formatPickedPathsForTerminal(railProjectPath, picked));
  };

  useEffect(() => {
    return globalThis.lazify.onAgentAttention((event) => {
      if (!event.waiting) return;

      setAttention({ projectName: event.projectName, agentLabel: event.agentLabel });
    });
  }, []);

  const previousTabIdRef = useRef<string | null>(null);

  const openPreview = () => {
    if (activeTabId && activeTabId !== PREVIEW_TAB_ID) {
      previousTabIdRef.current = activeTabId;
    }

    setPreviewOpen(true);
    setActiveTab(PREVIEW_TAB_ID);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (activeTabId !== PREVIEW_TAB_ID) return;

    const fallback =
      terminals.find(
        (terminal) => terminal.tabId === previousTabIdRef.current,
      ) ?? terminals[0];
    setActiveTab(fallback?.tabId ?? null);
  };

  const handleSyncProject = async () => {
    try {
      setSyncError(null);
      setSyncing(true);

      const synced = await onSyncProject();

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
    <CodeSelectionActionsProvider actions={codeSelectionActions}>
    <div className="flex h-full min-h-0 flex-col gap-4">

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
        <AgentNoProjectState
          agents={availableAgents}
          syncing={syncing}
          onSync={() => void handleSyncProject()}
        />
      ) : (
        <>
        <div
          className={clsx(
            "flex min-h-0 flex-1 flex-col gap-4 lg:flex-row",
            monitorMode && "hidden",
          )}
        >
          <AgentProjectPicker
            projects={projects}
            selectedPath={projectPath}
            runningCounts={runningCountByProject}
            waitingCounts={waitingByProject}
            tabCounts={tabCountByProject}
            onSelect={setProjectPath}
            onCloseProjectTabs={(closedPath) => {
              void closeProjectTerminals(closedPath);

              if (closedPath === projectPath) {
                setPreviewOpen(false);
                setRailTab((current) => (current === "debug" ? null : current));
              }
            }}
            onReorder={onReorderProjects}
            syncing={syncing}
            onSync={() => void handleSyncProject()}
            branch={gitStatus?.branch ?? null}
            branches={gitStatus?.isGitRepo ? gitStatus.branches : []}
            repoRoot={gitStatus?.repoRoot ?? ""}
            onBranchSwitched={() => {
              refreshBranch();

              void refresh();
            }}
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
              waitingTabIds={waitingTabIds}
              previewOpen={previewOpen}
              previewActive={previewActive}
              onSelectPreview={openPreview}
              onClosePreview={closePreview}
              onSelect={setActiveTab}
              onClose={closeTerminal}
              onReorder={reorderTerminal}
              onOpen={openTerminal}
              projectPath={projectPath}
              onRun={runProject}
              onCreateAgent={createAgent}
              onDeleteAgent={deleteAgent}
            />

            <div className="relative flex min-h-0 flex-1">
              <AgentTerminalStack
                terminals={terminals}
                activeTabId={activeTabId}
                hidden={previewActive}
                onResolveFilePath={terminalLinks.resolveFilePath}
                onOpenFilePath={terminalLinks.openFilePath}
              />

              <AgentRailPanels
                railTab={railTab}
                onCloseRail={() => setRailTab(null)}
                asModal={monitorMode}
                projectPath={railProjectPath}
                scriptTerminal={scriptTerminal}
                runnableScript={runnableScript}
                onStartScript={runProject}
                onRestartScript={() => void restartProject()}
                onStopScript={() => {
                  void stopProject().then((removed) => {
                    if (removed) setRailTab(null);
                  });
                }}
                changes={sessionChanges}
                changesLoading={loading}
                onRefreshChanges={refresh}
                onResetChanges={resetBaseline}
                activityEntries={activityEntries}
                onMarkActivityRead={markActivityRead}
                onClearActivity={clearActivity}
                onOpenRun={(entry) => {
                  setRailTab(null);
                  if (monitorMode) {
                    monitorPanels.setTarget(entry.runId);
                    return;
                  }
                  setProjectPath(entry.projectPath);
                  focusAgentRun(entry.runId);
                }}
                autopilotEnabled={autopilot.enabled}
                autopilotProjectEnabled={autopilot.projectEnabled}
                onToggleAutopilot={autopilot.setEnabled}
                onToggleAutopilotProject={autopilot.setProjectEnabled}
                onSendToTerminal={sendToTerminal}
                previewOpen={previewOpen}
                previewUrl={detectedPreviewUrl}
                previewRunning={isScriptRunning}
                previewActive={previewActive}
                usageReport={usageReport}
                usageLoading={usageLoading}
                onRefreshUsage={refreshUsage}
                onSetBudget={setBudget}
              />

              <AgentToolRail
                railTab={railTab}
                onToggleRail={(tab) => {
                  setRailTab((current) => (current === tab ? null : tab));
                }}
                showDebug={Boolean(scriptTerminal)}
                isScriptRunning={isScriptRunning}
                previewActive={previewActive}
                onSelectPreview={openPreview}
                changeCount={sessionChanges.length}
                activityUnread={activityUnread}
                onPickPath={
                  sendToTerminal ? () => void pickPathForTerminal() : null
                }
                onOpenConsole={() => void globalThis.lazify.openTerminal(projectPath)}
                onOpenMonitor={() => setMonitorMode(true)}
              />
            </div>
          </div>
        </div>

        {monitorMode ? (
          <AgentMonitorGrid
            projects={projects}
            panels={monitorPanels.panels}
            onStart={monitorPanels.start}
            onClear={monitorPanels.clear}
            onSetSize={monitorPanels.setSize}
            onRename={monitorPanels.rename}
            onClearAll={monitorPanels.clearAll}
            onReorder={monitorPanels.reorder}
            columns={monitorPanels.columns}
            onColumnsChange={monitorPanels.setColumns}
            waitingRunIds={Object.keys(waitingByRunId)}
            targetRunId={monitorPanels.target?.runId ?? null}
            onSelectPanel={monitorPanels.setTarget}
            rail={
              <AgentMonitorRail
                railTab={railTab}
                onToggleRail={(tab) => {
                  setRailTab((current) => (current === tab ? null : tab));
                }}
                targetLabel={monitorPanels.target?.projectName ?? null}
                changeCount={sessionChanges.length}
                activityUnread={activityUnread}
                onPickPath={
                  sendToTerminal ? () => void pickPathForTerminal() : null
                }
                onOpenConsole={() =>
                  void globalThis.lazify.openTerminal(railProjectPath)
                }
              />
            }
            availableAgents={availableAgents}
            onCreateAgent={createAgent}
            onDeleteAgent={deleteAgent}
            onExit={() => setMonitorMode(false)}
          />
        ) : null}
        </>
      )}

      <AgentFileModal
        file={terminalLinks.linkedFile?.node ?? null}
        focusLine={terminalLinks.linkedFile?.line ?? null}
        onSendToTerminal={sendToTerminal}
        onClose={terminalLinks.closeFile}
      />

      <SendToAgentDialog
        selection={sendingSelection}
        projectPath={railProjectPath || projectPath}
        agents={availableAgents}
        onStartAgent={openTerminal}
        onCreateAgent={createAgent}
        onDeleteAgent={deleteAgent}
        onSent={setRevealRunId}
        onClose={() => setSendingSelection(null)}
      />
    </div>
    </CodeSelectionActionsProvider>
  );
}
