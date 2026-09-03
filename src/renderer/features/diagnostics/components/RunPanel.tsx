import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";

import type { PanelModel } from "../lib/panel-model";
import { EvidenceRow } from "./EvidenceRow";
import { PanelAction } from "./PanelAction";
import { PanelSection } from "./PanelSection";
import { RunPanelHeader } from "./RunPanelHeader";
import { Screenshot } from "./Screenshot";
import { StepRow } from "./StepRow";

interface RunPanelProps {
	model: PanelModel;
	busy: boolean;
	exportedTo: string;
	onRun: (fileName: string) => void;
	onCancel: () => void;
	onExport: (runId: string) => void;
}

export function RunPanel({
	model,
	busy,
	exportedTo,
	onRun,
	onCancel,
	onExport,
}: Readonly<RunPanelProps>) {
	const { t } = useTranslation();
	const ranBefore = model.steps.some((step) => step.status);

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto">
			<RunPanelHeader
				title={model.title}
				subtitle={model.subtitle}
				state={model.state ?? undefined}
				facts={model.facts.map((entry) => ({ label: t(entry.label), value: entry.value }))}
				actions={
					<>
						{model.running ? (
							<PanelAction
								label={t(translation.Diagnostics.CancelRun)}
								icon="stop-circle"
								emphasis="danger"
								onClick={onCancel}
							/>
						) : null}

						{model.canRun ? (
							<PanelAction
								label={t(ranBefore ? translation.Diagnostics.RunAgain : translation.Diagnostics.RunFlow)}
								icon="play"
								emphasis="primary"
								disabled={busy}
								onClick={() => onRun(model.fileName)}
							/>
						) : null}

						{model.runId && !model.running ? (
							<PanelAction
								label={t(translation.Diagnostics.ExportReport)}
								icon="download"
								onClick={() => onExport(model.runId)}
							/>
						) : null}
					</>
				}
			/>

			{exportedTo ? (
				<CaptionText as="p" tone="success" className="px-4 pb-2">
					{t(translation.Diagnostics.ReportSaved, { path: exportedTo })}
				</CaptionText>
			) : null}

			<PanelSection title={t(translation.Diagnostics.Steps)} count={model.steps.length}>
				<ol className="divide-y divide-border/60 border-t border-border/60">
					{model.steps.map((step) => (
						<StepRow key={step.index} step={step} />
					))}
				</ol>
			</PanelSection>

			{model.state ? (
				<>
					<PanelSection
						title={t(translation.Diagnostics.Findings)}
						count={model.evidence.length}
						emptyMessage={model.running ? undefined : t(translation.Diagnostics.NoFindings)}
					>
						{model.evidence.length > 0 ? (
							<ul className="divide-y divide-border/60 border-t border-border/60">
								{model.evidence.map((item, position) => (
									<EvidenceRow key={`${item.timestamp}-${position}`} item={item} />
								))}
							</ul>
						) : undefined}
					</PanelSection>

					<PanelSection
						title={t(translation.Diagnostics.Screenshots)}
						count={model.artifacts.length}
						emptyMessage={model.running ? undefined : t(translation.Diagnostics.NoScreenshots)}
					>
						{model.artifacts.length > 0 ? (
							<div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 px-4 pb-4 pt-1">
								{model.artifacts.map((artifact) => (
									<Screenshot key={artifact.filePath} artifact={artifact} />
								))}
							</div>
						) : undefined}
					</PanelSection>
				</>
			) : null}
		</div>
	);
}
