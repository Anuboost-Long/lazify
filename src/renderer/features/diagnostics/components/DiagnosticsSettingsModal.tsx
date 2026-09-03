import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { DiagnosticConfig } from "@main/diagnostic-tests/types";
import { translation } from "@renderer/i18n/translation";
import { CaptionText, CardTitle } from "@renderer/shared/typography";
import { TextInput } from "@renderer/shared/ui/form/FormInput";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

import { FolderField } from "./FolderField";
import { LabelledField } from "./LabelledField";
import { PanelAction } from "./PanelAction";

interface DiagnosticsSettingsModalProps {
	open: boolean;
	notice: string;
	config: DiagnosticConfig | null;
	projectPath: string;
	onSave: (config: DiagnosticConfig) => void;
	onClose: () => void;
}

export function DiagnosticsSettingsModal({
	open,
	notice,
	config,
	projectPath,
	onSave,
	onClose,
}: Readonly<DiagnosticsSettingsModalProps>) {
	const { t } = useTranslation();
	const [draft, setDraft] = useState<DiagnosticConfig | null>(config);

	useEffect(() => {
		if (open) setDraft(config);
	}, [config, open]);

	if (!open || !draft) return null;

	const patch = (change: Partial<DiagnosticConfig>) => setDraft({ ...draft, ...change });

	return (
		<BaseModal open={open} onClose={onClose}>
			<div className="w-[min(560px,92vw)] rounded-2xl border border-border bg-soft p-5 shadow-panel">
				<CardTitle>{t(translation.Diagnostics.Settings)}</CardTitle>

				{notice ? (
					<CaptionText as="p" tone="warning" className="mt-1.5">
						{notice}
					</CaptionText>
				) : null}

				<div className="mt-4 flex flex-col gap-4">
					<LabelledField
						label={t(translation.Diagnostics.BaseUrl)}
						hint={t(translation.Diagnostics.BaseUrlHint)}
					>
						<TextInput
							size="sm"
							value={draft.baseUrl}
							placeholder="http://localhost:3000"
							onChange={(event) => patch({ baseUrl: event.target.value })}
						/>
					</LabelledField>

					<FolderField
						label={t(translation.Diagnostics.FlowsFolder)}
						hint={t(translation.Diagnostics.FlowsFolderHint)}
						value={draft.flowsDir}
						projectPath={projectPath}
						onChange={(flowsDir) => patch({ flowsDir })}
					/>

					<FolderField
						label={t(translation.Diagnostics.ArtifactsFolder)}
						hint={t(translation.Diagnostics.ArtifactsFolderHint)}
						value={draft.artifactsDir}
						placeholder={t(translation.Diagnostics.AppData)}
						projectPath={projectPath}
						onChange={(artifactsDir) => patch({ artifactsDir })}
					/>

					<LabelledField label={t(translation.Diagnostics.KeepRuns)}>
						<TextInput
							size="sm"
							type="number"
							min={1}
							value={draft.retainRuns}
							onChange={(event) => patch({ retainRuns: Number(event.target.value) || 1 })}
							className="max-w-[120px]"
						/>
					</LabelledField>
				</div>

				<div className="mt-6 flex justify-end gap-2">
					<PanelAction label={t(translation.GlobalTerm.Cancel)} icon="xmark" onClick={onClose} />
					<PanelAction
						label={t(translation.GlobalTerm.Save)}
						icon="check-circle"
						emphasis="primary"
						onClick={() => onSave(draft)}
					/>
				</div>
			</div>
		</BaseModal>
	);
}
