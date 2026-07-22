import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CaptionText } from "@renderer/shared/typography";
import { PageHeader } from "@renderer/shared/ui/PageHeader";
import { AgentChangesPanel } from "../components/AgentChangesPanel";
import { AgentUsagePanel } from "../components/AgentUsagePanel";
import { AgentEmptyState } from "../components/AgentEmptyState";
import { AgentProjectPicker } from "../components/AgentProjectPicker";
import { AgentTabBar } from "../components/AgentTabBar";
import { useAgentChanges } from "../hooks/use-agent-changes";
import { useAgentUsage } from "../hooks/use-agent-usage";
import { useAgentTerminals } from "../hooks/use-agent-terminals";

interface AgentsPageProps {
  projects: SyncedWorkspaceProject[];
}

export function AgentsPage({ projects }: Readonly<AgentsPageProps>) {
  const { t } = useTranslation();
  const [projectPath, setProjectPath] = useState(
    projects[0]?.projectPath ?? "",
  );
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
    createAgent,
    deleteAgent,
  } = useAgentTerminals(projectPath);

  return (
    <div className="flex h-[calc(100vh-6.5rem)] min-h-0 flex-col gap-6">
      <PageHeader
        eyebrow={t(translation.Agents.Eyebrow)}
        title={t(translation.Agents.Title)}
        description={t(translation.Agents.Description)}
        icon="code"
      />

      {projects.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <CaptionText tone="muted">
            {t(translation.Agents.NoProjects)}
          </CaptionText>
        </div>
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
