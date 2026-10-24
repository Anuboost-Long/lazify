import clsx from "clsx";
import { useState, type ReactNode } from "react";

import type { AgentDescriptor } from "@/shared/lib/agents/agent-registry";
import type { SyncedWorkspaceProject } from "@/shared/types/lazify";

import type { AgentTerminal } from "../hooks/agent-terminals";
import { AgentPickerModal } from "./agent-picker";
import { AgentTabBar, type AgentRailTab } from "./AgentTabBar";
import { AgentTerminalStack } from "./AgentTerminalStack";
import { AgentToolRail } from "./AgentToolRail";
import { AgentProjectPicker } from "./project-picker";

interface AgentWorkspaceProps {
	hidden: boolean;

	projects: SyncedWorkspaceProject[];
	projectPath: string;

	runningCounts: Record<string, number>;
	waitingCounts: Record<string, number>;
	tabCounts: Record<string, number>;

	onSelectProject: (projectPath: string) => void;
	onCloseProjectTabs: (projectPath: string) => void;
	onReorderProjects: (fromProjectPath: string, toProjectPath: string) => void;

	syncing: boolean;
	onSync: () => void;

	branch: string | null;
	branches: string[];
	repoRoot: string;
	onBranchSwitched: () => void;

	terminals: AgentTerminal[];
	activeTabId: string | null;
	availableAgents: AgentDescriptor[];

	runnableScript: string | null;
	allScripts: Record<string, string>;
	onSelectScript: (scriptName: string) => void;
	isScriptRunning: boolean;
	waitingTabIds: string[];

	onSelectTab: (tabId: string) => void;
	onCloseTab: (tabId: string) => void;
	onReorderTabs: (fromTabId: string, toTabId: string) => void;
	onOpenAgent: (agentId: string, resumeSessionId?: string) => void;
	onRun: () => void;
	onCreateAgent: (input: { label: string; command: string; image?: string }) => Promise<void>;
	onDeleteAgent: (agentId: string) => Promise<void>;

	previewOpen: boolean;
	previewActive: boolean;
	onSelectPreview: () => void;
	onClosePreview: () => void;

	onResolveFilePath: (printedPath: string) => Promise<string | null>;
	onOpenFilePath: (absolutePath: string, line: number | null) => void;

	railPanels: ReactNode;

	railTab: AgentRailTab | null;
	onToggleRail: (tab: AgentRailTab) => void;
	showDebug: boolean;
	changeCount: number;
	activityUnread: number;
	onPickPath: (() => void) | null;
	onOpenConsole: () => void;
}

export function AgentWorkspace({
	hidden,
	projects,
	projectPath,
	runningCounts,
	waitingCounts,
	tabCounts,
	onSelectProject,
	onCloseProjectTabs,
	onReorderProjects,
	syncing,
	onSync,
	branch,
	branches,
	repoRoot,
	onBranchSwitched,
	terminals,
	activeTabId,
	availableAgents,
	runnableScript,
	allScripts,
	onSelectScript,
	isScriptRunning,
	waitingTabIds,
	onSelectTab,
	onCloseTab,
	onReorderTabs,
	onOpenAgent,
	onRun,
	onCreateAgent,
	onDeleteAgent,
	previewOpen,
	previewActive,
	onSelectPreview,
	onClosePreview,
	onResolveFilePath,
	onOpenFilePath,
	railPanels,
	railTab,
	onToggleRail,
	showDebug,
	changeCount,
	activityUnread,
	onPickPath,
	onOpenConsole,
}: Readonly<AgentWorkspaceProps>) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const openPicker = () => setPickerOpen(true);

	return (
		<div className={clsx("flex min-h-0 flex-1 flex-col gap-4 lg:flex-row", hidden && "hidden")}>
			<AgentProjectPicker
				projects={projects}
				selectedPath={projectPath}
				runningCounts={runningCounts}
				waitingCounts={waitingCounts}
				tabCounts={tabCounts}
				onSelect={onSelectProject}
				onCloseProjectTabs={onCloseProjectTabs}
				onReorder={onReorderProjects}
				syncing={syncing}
				onSync={onSync}
				branch={branch}
				branches={branches}
				repoRoot={repoRoot}
				onBranchSwitched={onBranchSwitched}
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
					onSelectScript={onSelectScript}
					isScriptRunning={isScriptRunning}
					waitingTabIds={waitingTabIds}
					previewOpen={previewOpen}
					previewActive={previewActive}
					onSelectPreview={onSelectPreview}
					onClosePreview={onClosePreview}
					onSelect={onSelectTab}
					onClose={onCloseTab}
					onReorder={onReorderTabs}
					onNewAgent={openPicker}
					onOpenConsole={onOpenConsole}
					onPickPath={onPickPath}
					onRun={onRun}
				/>

				<div className="relative flex min-h-0 flex-1">
					<AgentTerminalStack
						terminals={terminals}
						activeTabId={activeTabId}
						hidden={previewActive}
						onResolveFilePath={onResolveFilePath}
						onOpenFilePath={onOpenFilePath}
						onNewAgent={openPicker}
					/>

					{railPanels}

					<AgentToolRail
						railTab={railTab}
						onToggleRail={onToggleRail}
						showDebug={showDebug}
						isScriptRunning={isScriptRunning}
						previewActive={previewActive}
						onSelectPreview={onSelectPreview}
						changeCount={changeCount}
						activityUnread={activityUnread}
					/>
				</div>
			</div>

			<AgentPickerModal
				open={pickerOpen}
				agents={availableAgents}
				projectPath={projectPath}
				onSelect={onOpenAgent}
				onClose={() => setPickerOpen(false)}
				onCreate={onCreateAgent}
				onDelete={onDeleteAgent}
			/>
		</div>
	);
}
