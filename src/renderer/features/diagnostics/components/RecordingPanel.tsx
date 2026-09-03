import { useTranslation } from "react-i18next";

import type { RecordedStep } from "@main/diagnostic-tests/recorder/recorded-step";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";

import { LabelledField } from "./LabelledField";
import { PanelAction } from "./PanelAction";
import { PanelSection } from "./PanelSection";
import { RunPanelHeader } from "./RunPanelHeader";
import { StepRow } from "./StepRow";

interface RecordingPanelProps {
	steps: RecordedStep[];
	live: boolean;
	error: string;
	url: string;
	name: string;
	onNameChange: (name: string) => void;
	onStop: () => void;
	onSave: () => void;
	onDiscard: () => void;
}

export function RecordingPanel({
	steps,
	live,
	error,
	url,
	name,
	onNameChange,
	onStop,
	onSave,
	onDiscard,
}: Readonly<RecordingPanelProps>) {
	const { t } = useTranslation();

	return (
		<div className="flex h-full min-h-0 flex-col overflow-y-auto">
			<RunPanelHeader
				title={t(live ? translation.Diagnostics.Recording : translation.Diagnostics.Recorded)}
				subtitle={live ? t(translation.Diagnostics.RecordingHint) : ""}
				facts={live ? [] : [{ label: t(translation.Diagnostics.Target), value: url }]}
				actions={
					live ? (
						<PanelAction
							label={t(translation.Diagnostics.StopRecording)}
							icon="stop-circle"
							emphasis="danger"
							onClick={onStop}
						/>
					) : (
						<>
							<PanelAction label={t(translation.Diagnostics.Discard)} icon="trash" onClick={onDiscard} />
							<PanelAction
								label={t(translation.Diagnostics.SaveFlow)}
								icon="check-circle"
								emphasis="primary"
								disabled={steps.length === 0 || !name.trim()}
								onClick={onSave}
							/>
						</>
					)
				}
			/>

			{error ? (
				<CaptionText as="p" tone="error" className="px-4 pb-3 leading-5">
					{error}
				</CaptionText>
			) : null}

			{live ? null : (
				<div className="max-w-sm px-4 pb-3">
					<LabelledField label={t(translation.Diagnostics.FlowName)}>
						<TextInput
							size="sm"
							value={name}
							onChange={(event) => onNameChange(event.target.value)}
							placeholder={t(translation.Diagnostics.FlowName)}
						/>
					</LabelledField>
				</div>
			)}

			<PanelSection title={t(translation.Diagnostics.Recorded)} count={steps.length}>
				{steps.length > 0 ? (
					<ol className="divide-y divide-border/60 border-t border-border/60">
						{steps.map((step, index) => (
							<StepRow
								key={`${index}-${step.description}`}
								step={{ index, description: step.description }}
							/>
						))}
					</ol>
				) : (
					<div className="px-4 pb-4 pt-1">
						<CaptionText as="p" className="!text-text font-semibold">
							{t(translation.Diagnostics.NothingRecorded)}
						</CaptionText>
						<CaptionText as="p" className="mt-0.5">
							{t(translation.Diagnostics.NothingRecordedHint)}
						</CaptionText>
					</div>
				)}
			</PanelSection>
		</div>
	);
}
