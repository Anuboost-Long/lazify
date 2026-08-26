import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import {
	CodeQualityActionsProvider,
	type CodeQualityActions,
} from "@renderer/shared/ui/code/diagnostics/quality-actions";
import type {
	CodeSelectionAction,
	CodeSelectionContext,
} from "@renderer/shared/ui/code/menu/code-selection";
import { CodeSelectionActionsProvider } from "@renderer/shared/ui/code/menu/selection-actions";
import { Toast } from "@renderer/shared/ui/toast/Toast";

import { AgentFileModal } from "../components/AgentFileModal";
import { AgentMonitorWall } from "../components/AgentMonitorWall";
import { AgentNoProjectState } from "../components/AgentNoProjectState";
import { AgentRailPanels } from "../components/AgentRailPanels";
import type { AgentRailTab } from "../components/AgentTabBar";
import { AgentWorkspace } from "../components/AgentWorkspace";
import { SendToAgentDialog, type AgentPayload } from "../components/send-to-agent";
import { useAgentTerminals, useFocusAgentRun } from "../hooks/agent-terminals";
import { revealRunIdAtom } from "../hooks/agent-terminals/terminal-store";
import { useAgentActivity } from "../hooks/use-agent-activity";
import { useAgentBranch } from "../hooks/use-agent-branch";
import { useAgentChanges } from "../hooks/use-agent-changes";
import { useAgentUsage } from "../hooks/use-agent-usage";
import { useAutopilot } from "../hooks/use-autopilot";
import { useMonitorPanels } from "../hooks/use-monitor-panels";
import { usePreviewUrl } from "../hooks/use-preview-url";
import { useTerminalLinks } from "../hooks/use-terminal-links";
import { buildFindingsPayload } from "../utils/diagnostic-payload";
import { formatPickedPathsForTerminal, resolveAgentProjectPath } from "../utils/paths";

const PREVIEW_TAB_ID = "agent-tab-preview";

interface AgentsPageProps {
	projects: SyncedWorkspaceProject[];

	onSyncProject: (projectPath?: string | null) => Promise<SyncedWorkspaceProject | null>;

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

	const monitorProjectPath = monitorPanels.target?.projectPath ?? "";
	const railProjectPath = monitorMode ? monitorProjectPath : projectPath;

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

	const scriptRunId = scriptTerminal?.runId ?? null;
	const previewRunId = previewOpen ? scriptRunId : null;
	const detectedPreviewUrl = usePreviewUrl(previewRunId, isScriptRunning);

	const {
		report: usageReport,
		loading: usageLoading,
		refresh: refreshUsage,
		setBudget,
	} = useAgentUsage(railTab === "usage", openAgentIds);

	const monitorRunId = monitorPanels.target?.runId ?? null;
	const terminalRunId = activeTerminal?.runId ?? null;
	const activeRunId = monitorMode ? monitorRunId : terminalRunId;

	const sendToTerminal = activeRunId
		? (text: string) => globalThis.lazify.ptyWrite(activeRunId, text)
		: null;

	const [sendingSelection, setSendingSelection] = useState<CodeSelectionContext | null>(null);

	const [sendingFinding, setSendingFinding] = useState<AgentPayload | null>(null);

	const codeSelectionActions: CodeSelectionAction[] = [
		{
			id: "send-to-agent",
			label: t(translation.Agents.SendSelectionToAgent),
			icon: "chat-question",
			onSelect: (selection) => {
				setSendingFinding(null);
				setSendingSelection(selection);
			},
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
			terminals.find((terminal) => terminal.tabId === previousTabIdRef.current) ?? terminals[0];
		setActiveTab(fallback?.tabId ?? null);
	};

	const handleSyncProject = async () => {
		try {
			setSyncError(null);
			setSyncing(true);

			const synced = await onSyncProject();

			if (synced) setProjectPath(synced.projectPath);
		} catch (error) {
			setSyncError(error instanceof Error ? error.message : t(translation.Workspace.SyncError));
		} finally {
			setSyncing(false);
		}
	};

	const toggleRail = (tab: AgentRailTab) => {
		setRailTab((current) => (current === tab ? null : tab));
	};

	const pickPath = sendToTerminal ? () => void pickPathForTerminal() : null;

	const hasProjects = projects.length > 0;
	const showMonitorWall = hasProjects && monitorMode;
	const branches = gitStatus?.isGitRepo ? gitStatus.branches : [];

	const railPanels = (
		<AgentRailPanels
			railTab={railTab}
			onCloseRail={() => setRailTab(null)}
			asModal={monitorMode}
			projectPath={railProjectPath}
			projects={projects}
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
	);

	const qualityActions: CodeQualityActions = {
		fix: (findings) => {
			setSendingSelection(null);
			setSendingFinding(buildFindingsPayload(findings, railProjectPath || projectPath));
		},
		createTask: (findings) => {
			void globalThis.lazify.createFixTask({
				projectPath: railProjectPath || projectPath,
				findings,
			});
		},
	};

	return (
		<CodeSelectionActionsProvider actions={codeSelectionActions}>
			<CodeQualityActionsProvider actions={qualityActions}>
				<div className="flex h-full min-h-0 flex-col gap-4">
					{syncError && (
						<Toast
							title={t(translation.Workspace.AlreadySynced)}
							message={syncError}
							onClose={() => setSyncError(null)}
						/>
					)}

					{attention && (
						<Toast
							title={t(translation.Agents.NeedsAttention)}
							message={t(translation.Agents.NeedsAttentionToast, {
								agent: attention.agentLabel,
								project: attention.projectName,
							})}
							onClose={() => setAttention(null)}
						/>
					)}

					{!hasProjects && (
						<AgentNoProjectState
							agents={availableAgents}
							syncing={syncing}
							onSync={() => void handleSyncProject()}
						/>
					)}

					{hasProjects && (
						<AgentWorkspace
							hidden={monitorMode}
							projects={projects}
							projectPath={projectPath}
							runningCounts={runningCountByProject}
							waitingCounts={waitingByProject}
							tabCounts={tabCountByProject}
							onSelectProject={setProjectPath}
							onCloseProjectTabs={(closedPath) => {
								void closeProjectTerminals(closedPath);

								if (closedPath === projectPath) {
									setPreviewOpen(false);
									setRailTab((current) => (current === "debug" ? null : current));
								}
							}}
							onReorderProjects={onReorderProjects}
							syncing={syncing}
							onSync={() => void handleSyncProject()}
							branch={gitStatus?.branch ?? null}
							branches={branches}
							repoRoot={gitStatus?.repoRoot ?? ""}
							onBranchSwitched={() => {
								refreshBranch();

								void refresh();
							}}
							terminals={terminals}
							activeTabId={activeTabId}
							availableAgents={availableAgents}
							runnableScript={runnableScript}
							allScripts={allScripts}
							onSelectScript={setRunnableScript}
							isScriptRunning={isScriptRunning}
							waitingTabIds={waitingTabIds}
							onSelectTab={setActiveTab}
							onCloseTab={closeTerminal}
							onReorderTabs={reorderTerminal}
							onOpenAgent={openTerminal}
							onRun={runProject}
							onCreateAgent={createAgent}
							onDeleteAgent={deleteAgent}
							previewOpen={previewOpen}
							previewActive={previewActive}
							onSelectPreview={openPreview}
							onClosePreview={closePreview}
							onResolveFilePath={terminalLinks.resolveFilePath}
							onOpenFilePath={terminalLinks.openFilePath}
							railPanels={railPanels}
							railTab={railTab}
							onToggleRail={toggleRail}
							showDebug={Boolean(scriptTerminal)}
							changeCount={sessionChanges.length}
							activityUnread={activityUnread}
							onPickPath={pickPath}
							onOpenConsole={() => void globalThis.lazify.openTerminal(projectPath)}
							onOpenMonitor={() => setMonitorMode(true)}
						/>
					)}

					{showMonitorWall && (
						<AgentMonitorWall
							projects={projects}
							monitor={monitorPanels}
							waitingRunIds={Object.keys(waitingByRunId)}
							availableAgents={availableAgents}
							onCreateAgent={createAgent}
							onDeleteAgent={deleteAgent}
							railTab={railTab}
							onToggleRail={toggleRail}
							changeCount={sessionChanges.length}
							activityUnread={activityUnread}
							onPickPath={pickPath}
							onOpenConsole={() => void globalThis.lazify.openTerminal(railProjectPath)}
						/>
					)}

					<AgentFileModal
						file={terminalLinks.linkedFile?.node ?? null}
						focusLine={terminalLinks.linkedFile?.line ?? null}
						onSendToTerminal={sendToTerminal}
						onClose={terminalLinks.closeFile}
					/>

					<SendToAgentDialog
						selection={sendingSelection}
						payload={sendingFinding}
						projectPath={railProjectPath || projectPath}
						agents={availableAgents}
						onStartAgent={openTerminal}
						onCreateAgent={createAgent}
						onDeleteAgent={deleteAgent}
						onSent={setRevealRunId}
						onClose={() => {
							setSendingSelection(null);
							setSendingFinding(null);
						}}
					/>
				</div>
			</CodeQualityActionsProvider>
		</CodeSelectionActionsProvider>
	);
}
