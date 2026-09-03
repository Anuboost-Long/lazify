import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { RunSummary } from "@main/diagnostic-tests/run/run-store";
import type { FlowSummary } from "@main/diagnostic-tests/service";
import { translation } from "@renderer/i18n/translation";
import { ContextMenu, type ContextMenuItem } from "@renderer/shared/ui/ContextMenu";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import { FlowRow } from "./FlowRow";
import { RailAction } from "./RailAction";
import { RailEmpty } from "./RailEmpty";
import { RailSection } from "./RailSection";
import { RunRow } from "./RunRow";

interface DiagnosticsRailProps {
	flows: FlowSummary[];
	runs: RunSummary[];
	selectedFlowFile: string;
	selectedRunId: string;
	recording: boolean;
	onSelectFlow: (fileName: string) => void;
	onSelectRun: (runId: string) => void;
	onRefresh: () => void;
	onAddExampleFlow: () => void;
	onRecord: () => void;
	onDeleteFlow: (fileName: string) => void;
	onDeleteRun: (runId: string) => void;
	onClearRuns: () => void;
}

interface MenuState {
	position: { x: number; y: number };
	items: ContextMenuItem[];
}

export function DiagnosticsRail({
	flows,
	runs,
	selectedFlowFile,
	selectedRunId,
	recording,
	onSelectFlow,
	onSelectRun,
	onRefresh,
	onAddExampleFlow,
	onRecord,
	onDeleteFlow,
	onDeleteRun,
	onClearRuns,
}: Readonly<DiagnosticsRailProps>) {
	const { t } = useTranslation();
	const [menu, setMenu] = useState<MenuState | null>(null);

	const openMenu = (event: React.MouseEvent, items: ContextMenuItem[]) => {
		event.preventDefault();
		setMenu({ position: { x: event.clientX, y: event.clientY }, items });
	};

	return (
		<div className="h-full min-h-0 divide-y divide-border overflow-y-auto border-r border-border bg-soft">
			<RailSection
				title={t(translation.Diagnostics.Flows)}
				action={
					<span className="flex items-center gap-0.5">
						<Tooltip content={t(translation.Diagnostics.RecordFlow)} side="left">
							<RailAction
								icon="play"
								label={t(translation.Diagnostics.RecordFlow)}
								disabled={recording}
								onClick={onRecord}
							/>
						</Tooltip>
						<Tooltip content={t(translation.Diagnostics.Refresh)} side="left">
							<RailAction
								icon="refresh-circle"
								label={t(translation.Diagnostics.Refresh)}
								onClick={onRefresh}
							/>
						</Tooltip>
					</span>
				}
			>
				{flows.length === 0 ? (
					<RailEmpty
						title={t(translation.Diagnostics.NoFlowsTitle)}
						description={t(translation.Diagnostics.NoFlowsDescription)}
						action={
							<button
								type="button"
								onClick={onAddExampleFlow}
								className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-text transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
							>
								{t(translation.Diagnostics.AddExampleFlow)}
							</button>
						}
					/>
				) : (
					flows.map((flow) => (
						<FlowRow
							key={flow.fileName}
							flow={flow}
							selected={flow.fileName === selectedFlowFile}
							onSelect={() => onSelectFlow(flow.fileName)}
							onContextMenu={(event) =>
								openMenu(event, [
									{
										key: "delete",
										label: t(translation.Diagnostics.DeleteFlow),
										destructive: true,
										onSelect: () => onDeleteFlow(flow.fileName),
									},
								])
							}
						/>
					))
				)}
			</RailSection>

			<RailSection
				title={t(translation.Diagnostics.Runs)}
				action={
					runs.length > 0 ? (
						<Tooltip content={t(translation.Diagnostics.ClearRuns)} side="left">
							<RailAction
								icon="trash"
								label={t(translation.Diagnostics.ClearRuns)}
								onClick={onClearRuns}
							/>
						</Tooltip>
					) : null
				}
			>
				{runs.length === 0 ? (
					<RailEmpty
						title={t(translation.Diagnostics.NoRunsTitle)}
						description={t(translation.Diagnostics.NoRunsDescription)}
					/>
				) : (
					runs.map((run) => (
						<RunRow
							key={run.id}
							run={run}
							selected={run.id === selectedRunId}
							onSelect={() => onSelectRun(run.id)}
							onContextMenu={(event) =>
								openMenu(event, [
									{
										key: "delete",
										label: t(translation.Diagnostics.DeleteRun),
										destructive: true,
										onSelect: () => onDeleteRun(run.id),
									},
								])
							}
						/>
					))
				)}
			</RailSection>

			<ContextMenu
				position={menu?.position ?? null}
				items={menu?.items ?? []}
				onClose={() => setMenu(null)}
			/>
		</div>
	);
}
