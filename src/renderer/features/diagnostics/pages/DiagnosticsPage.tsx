import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { ProjectPickerModal } from "@renderer/shared/ui/project-picker/ProjectPickerModal";
import { SplitPane } from "@renderer/shared/ui/split/SplitPane";

import { diagnosticsTool } from "../../tools/catalog";
import { ToolPageHeader } from "../../tools/components/ToolPageHeader";
import { DiagnosticsRail } from "../components/DiagnosticsRail";
import { DiagnosticsSettingsModal } from "../components/DiagnosticsSettingsModal";
import { DiagnosticsNoProjectState } from "../components/no-project/DiagnosticsNoProjectState";
import { PanelPlaceholder } from "../components/PanelPlaceholder";
import { ProjectButton } from "../components/ProjectButton";
import { RailAction } from "../components/RailAction";
import { RecordingPanel } from "../components/RecordingPanel";
import { RunPanel } from "../components/RunPanel";
import { useDiagnosticsWorkspace } from "../hooks/use-diagnostics-workspace";
import { useElapsed } from "../hooks/use-elapsed";
import { flowPanel, livePanel, recordPanel } from "../lib/panel-model";

interface DiagnosticsPageProps {
	projects: SyncedWorkspaceProject[];
	activeProjectPath: string | null;
	onActiveProjectChange: (projectPath: string) => void;
	onSyncProject: () => Promise<SyncedWorkspaceProject | null>;
}

export function DiagnosticsPage({
	projects,
	activeProjectPath,
	onActiveProjectChange,
	onSyncProject,
}: Readonly<DiagnosticsPageProps>) {
	const { t } = useTranslation();
	const [pickingProject, setPickingProject] = useState(false);
	const [editingSettings, setEditingSettings] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [needsBaseUrl, setNeedsBaseUrl] = useState(false);
	const projectPath =
		projects.find((project) => project.projectPath === activeProjectPath)?.projectPath ??
		projects[0]?.projectPath ??
		"";
	const projectName = projects.find((project) => project.projectPath === projectPath)?.projectName;

	const workspace = useDiagnosticsWorkspace(projectPath);
	const { live, openRun, selectedFlow, recording } = workspace;
	const elapsed = useElapsed(live?.startedAt ?? 0, workspace.busy);

	const syncProject = async () => {
		setSyncing(true);
		try {
			await onSyncProject();
		} finally {
			setSyncing(false);
		}
	};

	const startRecording = async () => {
		if (!workspace.config?.baseUrl) {
			setNeedsBaseUrl(true);
			setEditingSettings(true);
			return;
		}

		setNeedsBaseUrl(false);
		await workspace.startRecording();
	};

	const model = live
		? livePanel(live, selectedFlow, elapsed)
		: (openRun && recordPanel(openRun)) || (selectedFlow && flowPanel(selectedFlow)) || null;

	const renderPanel = () => {
		if (recording) {
			return (
				<RecordingPanel
					steps={recording.steps}
					live={recording.live}
					error={recording.error}
					url={recording.url}
					name={recording.name}
					onNameChange={workspace.renameRecording}
					onStop={workspace.stopRecording}
					onSave={workspace.saveRecording}
					onDiscard={workspace.discardRecording}
				/>
			);
		}

		if (model) {
			return (
				<RunPanel
					model={model}
					busy={workspace.busy}
					exportedTo={workspace.exportedTo}
					onRun={workspace.runFlow}
					onCancel={workspace.cancelRun}
					onExport={workspace.exportReport}
				/>
			);
		}

		return (
			<PanelPlaceholder
				title={t(translation.Diagnostics.SelectFlowTitle)}
				description={t(translation.Diagnostics.SelectFlowDescription)}
			/>
		);
	};

	return (
		<div className="flex h-full min-h-0 flex-col">
			<ToolPageHeader tool={diagnosticsTool}>
				<ProjectButton projectName={projectName ?? ""} onClick={() => setPickingProject(true)} />
				{projectPath ? (
					<RailAction
						icon="settings"
						label={t(translation.Diagnostics.Settings)}
						onClick={() => setEditingSettings(true)}
					/>
				) : null}
			</ToolPageHeader>

			{projectPath ? (
				<SplitPane
					className="min-h-0 flex-1"
					storageKey="lazify-diagnostics-rail"
					defaultSize={260}
					minSize={200}
					minOtherSize={420}
					label={t(translation.Diagnostics.Flows)}
					first={
						<DiagnosticsRail
							flows={workspace.flows}
							runs={workspace.runs}
							selectedFlowFile={workspace.selectedFlowFile}
							selectedRunId={openRun?.id ?? ""}
							recording={Boolean(recording)}
							onSelectFlow={workspace.selectFlow}
							onSelectRun={workspace.selectRun}
							onRefresh={workspace.reloadFlows}
							onAddExampleFlow={workspace.addExampleFlow}
							onRecord={startRecording}
							onDeleteFlow={workspace.deleteFlow}
							onDeleteRun={workspace.deleteRun}
							onClearRuns={workspace.clearRuns}
						/>
					}
					second={renderPanel()}
				/>
			) : (
				<DiagnosticsNoProjectState syncing={syncing} onSync={syncProject} />
			)}

			<ProjectPickerModal
				open={pickingProject}
				projects={projects}
				selectedPath={projectPath}
				title={translation.Diagnostics.ChooseProject}
				emptyMessage={translation.Diagnostics.SyncProjectTitle}
				onSelect={onActiveProjectChange}
				onClose={() => setPickingProject(false)}
			/>

			<DiagnosticsSettingsModal
				open={editingSettings}
				notice={needsBaseUrl ? t(translation.Diagnostics.NeedsBaseUrl) : ""}
				config={workspace.config}
				projectPath={projectPath}
				onSave={(next) => {
					void workspace.saveConfig(next);
					setEditingSettings(false);
				}}
				onClose={() => {
					setEditingSettings(false);
					setNeedsBaseUrl(false);
				}}
			/>
		</div>
	);
}
