import type { AgentActivityEntry } from "../hooks/use-agent-activity";
import type { AgentTerminal } from "../hooks/agent-terminals";
import type { AgentFileChange, AgentUsageReport } from "@renderer/shared/types/lazify";
import { AgentActivityPanel } from "./AgentActivityPanel";
import { AgentChangesPanel } from "./AgentChangesPanel";
import { AgentDebugPanel } from "./AgentDebugPanel";
import { AgentEnvPanel } from "./env/AgentEnvPanel";
import { AgentFilesPanel } from "./files";
import { AgentGitModal } from "./git";
import { AgentPreviewPanel } from "./preview";
import { AgentRailPanelHost } from "./AgentRailPanelHost";
import { AgentUsagePanel } from "./usage";
import type { AgentRailTab } from "./AgentTabBar";

interface AgentRailPanelsProps {
  railTab: AgentRailTab | null;
  onCloseRail: () => void;

  asModal: boolean;

  projectPath: string;

  scriptTerminal: AgentTerminal | null;
  runnableScript: string | null;
  onStartScript: () => void;
  onRestartScript: () => void;
  onStopScript: () => void;

  changes: AgentFileChange[];
  changesLoading: boolean;
  onRefreshChanges: () => void;
  onResetChanges: () => void;

  activityEntries: AgentActivityEntry[];
  onMarkActivityRead: () => void;
  onClearActivity: () => void;
  onOpenRun: (entry: AgentActivityEntry) => void;
  autopilotEnabled: boolean;
  autopilotProjectEnabled: boolean;
  onToggleAutopilot: (next: boolean) => void;
  onToggleAutopilotProject: (next: boolean) => void;

  onSendToTerminal: ((text: string) => void) | null;

  previewOpen: boolean;
  previewUrl: string | null;
  previewRunning: boolean;
  previewActive: boolean;

  usageReport: AgentUsageReport | null;
  usageLoading: boolean;
  onRefreshUsage: () => void;
  onSetBudget: (agentId: string, weeklyTokens: number) => void;
}

export function AgentRailPanels({
  railTab,
  onCloseRail,
  asModal,
  projectPath,
  scriptTerminal,
  runnableScript,
  onStartScript,
  onRestartScript,
  onStopScript,
  changes,
  changesLoading,
  onRefreshChanges,
  onResetChanges,
  activityEntries,
  onMarkActivityRead,
  onClearActivity,
  onOpenRun,
  autopilotEnabled,
  autopilotProjectEnabled,
  onToggleAutopilot,
  onToggleAutopilotProject,
  onSendToTerminal,
  previewOpen,
  previewUrl,
  previewRunning,
  previewActive,
  usageReport,
  usageLoading,
  onRefreshUsage,
  onSetBudget,
}: Readonly<AgentRailPanelsProps>) {
  const variant = asModal ? "modal" : "rail";

  return (
    <>
      {railTab === "debug" ? (
        <AgentDebugPanel
          terminal={scriptTerminal}
          runnableScript={runnableScript}
          onStart={onStartScript}
          onRestart={onRestartScript}
          onStop={onStopScript}
          onClose={onCloseRail}
        />
      ) : null}

      {railTab === "changes" ? (
        <AgentRailPanelHost asModal={asModal} onClose={onCloseRail}>
          <AgentChangesPanel
            variant={variant}
            projectPath={projectPath}
            changes={changes}
            loading={changesLoading}
            onRefresh={onRefreshChanges}
            onReset={onResetChanges}
            onClose={onCloseRail}
          />
        </AgentRailPanelHost>
      ) : null}

      {/* Source control is a modal in both layouts, never a rail panel. */}
      {railTab === "git" ? (
        <AgentGitModal projectPath={projectPath} onClose={onCloseRail} />
      ) : null}

      {railTab === "activity" ? (
        <AgentRailPanelHost asModal={asModal} onClose={onCloseRail}>
          <AgentActivityPanel
            variant={variant}
            entries={activityEntries}
            projectPath={projectPath}
            onMarkRead={onMarkActivityRead}
            onClear={onClearActivity}
            onOpenRun={onOpenRun}
            onClose={onCloseRail}
            autopilotEnabled={autopilotEnabled}
            autopilotProjectEnabled={autopilotProjectEnabled}
            onToggleAutopilot={onToggleAutopilot}
            onToggleAutopilotProject={onToggleAutopilotProject}
          />
        </AgentRailPanelHost>
      ) : null}

      {railTab === "env" ? (
        <AgentRailPanelHost asModal={asModal} onClose={onCloseRail}>
          <AgentEnvPanel variant={variant} projectPath={projectPath} onClose={onCloseRail} />
        </AgentRailPanelHost>
      ) : null}

      {railTab === "files" ? (
        <AgentRailPanelHost asModal={asModal} onClose={onCloseRail}>
          <AgentFilesPanel
            variant={variant}
            projectPath={projectPath}
            onSendToTerminal={onSendToTerminal}
            onClose={onCloseRail}
          />
        </AgentRailPanelHost>
      ) : null}

      {previewOpen ? (
        <AgentPreviewPanel
          detectedUrl={previewUrl}
          isRunning={previewRunning}
          visible={previewActive}
        />
      ) : null}

      {railTab === "usage" ? (
        <AgentRailPanelHost asModal={asModal} onClose={onCloseRail}>
          <AgentUsagePanel
            variant={variant}
            report={usageReport}
            loading={usageLoading}
            onRefresh={onRefreshUsage}
            onSetBudget={onSetBudget}
            onClose={onCloseRail}
          />
        </AgentRailPanelHost>
      ) : null}
    </>
  );
}
