import clsx from "clsx";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CardTitle, CaptionText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";

import type { AgentDescriptor } from "../../../../main/agents/agent-registry";
import type { MonitorColumns, MonitorPanel, MonitorPanelSize } from "../hooks/use-monitor-panels";
import { AgentMonitorPanel } from "./AgentMonitorPanel";
import { AgentMonitorSlot } from "./AgentMonitorSlot";
import { MonitorModals } from "./monitor/MonitorModals";

const MONITOR_MIN_SLOTS = 6;

const COLUMN_CLASS: Record<MonitorColumns, string> = {
	auto: "grid-cols-1 md:grid-cols-2 2xl:grid-cols-3",
	1: "grid-cols-1",
	2: "grid-cols-1 md:grid-cols-2",
	3: "grid-cols-1 md:grid-cols-3",
};

interface AgentMonitorGridProps {
	projects: SyncedWorkspaceProject[];
	panels: MonitorPanel[];

	onStart: (input: {
		projectPath: string;
		kind: "agent" | "script";
		sourceId: string;
		resumeSessionId?: string;
	}) => void;
	onClear: (runId: string) => void;

	onSetSize: (runId: string, size: MonitorPanelSize) => void;

	onRename: (runId: string, title: string) => void;

	onClearAll: () => void;

	onReorder: (fromRunId: string, toRunId: string) => void;

	onTidyUp: () => void;

	columns: MonitorColumns;
	onColumnsChange: (columns: MonitorColumns) => void;

	waitingRunIds: string[];

	targetRunId: string | null;
	onSelectPanel: (runId: string) => void;

	rail: ReactNode;

	availableAgents: AgentDescriptor[];
	onCreateAgent: (input: { label: string; command: string; image?: string }) => Promise<void>;
	onDeleteAgent: (agentId: string) => Promise<void>;

	onExit: () => void;
}

export function AgentMonitorGrid({
	projects,
	panels,
	onStart,
	onClear,
	onSetSize,
	onRename,
	onClearAll,
	onReorder,
	onTidyUp,
	columns,
	onColumnsChange,
	waitingRunIds,
	targetRunId,
	onSelectPanel,
	rail,
	availableAgents,
	onCreateAgent,
	onDeleteAgent,
	onExit,
}: Readonly<AgentMonitorGridProps>) {
	const { t } = useTranslation();

	const [choosing, setChoosing] = useState(false);

	const [agentProject, setAgentProject] = useState<SyncedWorkspaceProject | null>(null);

	const [setupRun, setSetupRun] = useState(0);
	const restartSetup = useCallback(() => setSetupRun((run) => run + 1), []);

	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);

	const [pickingLayout, setPickingLayout] = useState(false);

	const [sizingRunId, setSizingRunId] = useState<string | null>(null);
	const [renamingRunId, setRenamingRunId] = useState<string | null>(null);

	const [confirmingClearAll, setConfirmingClearAll] = useState(false);

	const draggingIdRef = useRef<string | null>(null);
	draggingIdRef.current = draggingId;

	const beginDrag = useCallback((runId: string) => {
		draggingIdRef.current = runId;
		setDraggingId(runId);
	}, []);

	const markDropTarget = useCallback((runId: string) => setDropTargetId(runId), []);

	const unmarkDropTarget = useCallback((runId: string) => {
		setDropTargetId((current) => (current === runId ? null : current));
	}, []);

	const openSizeChooser = useCallback((runId: string) => setSizingRunId(runId), []);
	const openRenameDialog = useCallback((runId: string) => setRenamingRunId(runId), []);
	const openSetup = useCallback(() => {
		restartSetup();
		setChoosing(true);
	}, [restartSetup]);

	const endDrag = useCallback(() => {
		draggingIdRef.current = null;
		setDraggingId(null);
		setDropTargetId(null);
	}, []);

	const handleDrop = useCallback(
		(runId: string) => {
			const from = draggingIdRef.current;
			if (from) onReorder(from, runId);
			endDrag();
		},
		[endDrag, onReorder],
	);

	const emptySlotCount = Math.max(MONITOR_MIN_SLOTS - panels.length, 1);
	const sizingPanel = panels.find((panel) => panel.runId === sizingRunId) ?? null;
	const renamingPanel = panels.find((panel) => panel.runId === renamingRunId) ?? null;

	return (
		<div
			className={clsx(
				"flex min-h-0 flex-1 flex-col overflow-hidden",
				"rounded-2xl border border-border bg-soft",
			)}
		>
			<div
				className={clsx(
					"flex shrink-0 items-center justify-between gap-3",
					"border-b border-border px-4 py-2.5",
				)}
			>
				<div className="flex min-w-0 flex-col">
					<CardTitle className="!text-text">{t(translation.Agents.LiveMonitor)}</CardTitle>
					<CaptionText className="!text-muted">{t(translation.Agents.LiveMonitorDesc)}</CaptionText>
				</div>

				<div className="flex shrink-0 items-center gap-1">
					{panels.length > 1 ? (
						<IconButton
							icon="sparks"
							title={t(translation.Agents.MonitorTidy)}
							aria-label={t(translation.Agents.MonitorTidy)}
							onClick={onTidyUp}
						/>
					) : null}

					{panels.length > 0 ? (
						<IconButton
							icon="trash"
							title={t(translation.Agents.MonitorClearAll)}
							aria-label={t(translation.Agents.MonitorClearAll)}
							iconClassName="text-error"
							onClick={() => setConfirmingClearAll(true)}
						/>
					) : null}

					<IconButton
						icon="multi-window"
						title={t(translation.Agents.MonitorLayout)}
						aria-label={t(translation.Agents.MonitorLayout)}
						onClick={() => setPickingLayout(true)}
					/>

					<IconButton
						icon="xmark"
						title={t(translation.Agents.LiveMonitorExit)}
						aria-label={t(translation.Agents.LiveMonitorExit)}
						onClick={onExit}
					/>
				</div>
			</div>

			<div className="flex min-h-0 flex-1">
				<div className="min-h-0 flex-1 overflow-y-auto p-4">
					<div className={clsx("grid gap-3 auto-rows-[22rem]", COLUMN_CLASS[columns])}>
						{panels.map((panel) => (
							<AgentMonitorPanel
								key={panel.id}
								panel={panel}
								selected={panel.runId === targetRunId}
								waiting={waitingRunIds.includes(panel.runId)}

								allowSpan={columns !== 1}
								onSelect={onSelectPanel}
								onPickSize={openSizeChooser}
								onRename={openRenameDialog}
								onClear={onClear}
								dragging={draggingId === panel.runId}
								dropTarget={dropTargetId === panel.runId && draggingId !== panel.runId}
								onDragStart={beginDrag}
								onDragOver={markDropTarget}
								onDragLeave={unmarkDropTarget}
								onDrop={handleDrop}
								onDragEnd={endDrag}
							/>
						))}

						{Array.from({ length: emptySlotCount }).map((_, index) => (
							<AgentMonitorSlot key={index} index={panels.length + index + 1} onAdd={openSetup} />
						))}
					</div>
				</div>

				{rail}
			</div>

			<MonitorModals
				projects={projects}
				panelCount={panels.length}
				renamingPanel={renamingPanel}
				onRename={onRename}
				onCloseRename={() => setRenamingRunId(null)}
				confirmingClearAll={confirmingClearAll}
				onClearAll={() => {
					onClearAll();
					setConfirmingClearAll(false);
				}}
				onCloseClearAll={() => setConfirmingClearAll(false)}
				sizingPanel={sizingPanel}
				onSetSize={onSetSize}
				onCloseSize={() => setSizingRunId(null)}
				pickingLayout={pickingLayout}
				columns={columns}
				onColumnsChange={onColumnsChange}
				onCloseLayout={() => setPickingLayout(false)}
				setupKey={setupRun}
				choosing={choosing}
				onCloseChoosing={() => setChoosing(false)}
				onPickScript={(project, scriptName) => {
					setChoosing(false);
					onStart({
						projectPath: project.projectPath,
						kind: "script",
						sourceId: scriptName,
					});
				}}
				onPickAgentRoute={(project) => {
					setChoosing(false);
					setAgentProject(project);
				}}
				agentProject={agentProject}
				availableAgents={availableAgents}
				onSelectAgent={(agentId, resumeSessionId) => {
					if (!agentProject) return;
					onStart({
						projectPath: agentProject.projectPath,
						kind: "agent",
						sourceId: agentId,
						resumeSessionId,
					});
					setAgentProject(null);
					restartSetup();
				}}
				onCloseAgentPicker={() => {
					setAgentProject(null);
					restartSetup();
				}}
				onBackFromAgentPicker={() => {
					setAgentProject(null);
					setChoosing(true);
				}}
				onCreateAgent={onCreateAgent}
				onDeleteAgent={onDeleteAgent}
			/>
		</div>
	);
}
