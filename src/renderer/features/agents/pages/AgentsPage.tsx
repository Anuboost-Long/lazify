import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { Toast } from "@renderer/shared/ui/toast/Toast";
import { AgentChangesPanel } from "../components/AgentChangesPanel";
import { AgentUsagePanel } from "../components/AgentUsagePanel";
import { AgentEmptyState } from "../components/AgentEmptyState";
import { AgentNoProjectState } from "../components/AgentNoProjectState";
import { AgentProjectPicker } from "../components/AgentProjectPicker";
import { AgentTabBar } from "../components/AgentTabBar";
import { useAgentChanges } from "../hooks/use-agent-changes";
import { useAgentUsage } from "../hooks/use-agent-usage";
import { useAgentTerminals } from "../hooks/use-agent-terminals";

interface AgentsPageProps {
  projects: SyncedWorkspaceProject[];
  /** Opens the folder picker and syncs whatever the user chooses. */
  onSyncProject: (
    projectPath?: string | null,
  ) => Promise<SyncedWorkspaceProject | null>;
}

export function AgentsPage({
  projects,
  onSyncProject,
}: Readonly<AgentsPageProps>) {
  const { t } = useTranslation();
  const [projectPath, setProjectPath] = useState(
    projects[0]?.projectPath ?? "",
  );
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  // One rail, two tabs: clicking the open tab's button closes it again.
  const [railTab, setRailTab] = useState<"changes" | "usage" | null>(null);
  const { sessionChanges, loading, refresh, resetBaseline } = useAgentChanges(
    projectPath,
    railTab === "changes",
  );
  const {
    report: usageReport,
    loading: usageLoading,
    refresh: refreshUsage,
    setBudget,
  } = useAgentUsage(railTab === "usage");
  const {
    availableAgents,
    runningCountByProject,
    terminals,
    activeTerminal,
    activeTabId,
    runnableScript,
    setActiveTab,
    openTerminal,
    runProject,
    closeTerminal,
    reorderTerminal,
    createAgent,
    deleteAgent,
  } = useAgentTerminals(projectPath);

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
      <PageHeader
        eyebrow={t(translation.Agents.Eyebrow)}
        title={t(translation.Agents.Title)}
        description={t(translation.Agents.Description)}
        icon="code"
      />

      {/* Syncing is reachable from both branches, so the error is shown once here. */}
      {syncError ? (
        <Toast
          title={t(translation.Workspace.AlreadySynced)}
          message={syncError}
          onClose={() => setSyncError(null)}
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
            onSelect={setProjectPath}
            syncing={syncing}
            onSync={() => void handleSyncProject()}
          />

          <div
            className={clsx(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
              "rounded-2xl border border-border bg-[#0a0e17]",
            )}
          >
            <AgentTabBar
              terminals={terminals}
              activeTabId={activeTabId}
              availableAgents={availableAgents}
              runnableScript={runnableScript}
              changeCount={sessionChanges.length}
              railTab={railTab}
              onToggleRail={(tab) =>
                setRailTab((current) => (current === tab ? null : tab))
              }
              onSelect={setActiveTab}
              onClose={closeTerminal}
              onReorder={reorderTerminal}
              onOpen={openTerminal}
              onRun={runProject}
              onCreateAgent={createAgent}
              onDeleteAgent={deleteAgent}
            />

            {/* Terminal and the changes rail share the row below the tab bar. */}
            <div className="flex min-h-0 flex-1">
              <div className="relative min-h-0 min-w-0 flex-1">
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
