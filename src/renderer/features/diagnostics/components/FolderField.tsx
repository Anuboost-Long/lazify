import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { TextInput } from "@renderer/shared/ui/form/FormInput";

import { LabelledField } from "./LabelledField";
import { PanelAction } from "./PanelAction";

interface FolderFieldProps {
	label: string;
	hint?: string;
	value: string;
	placeholder?: string;
	projectPath: string;
	onChange: (value: string) => void;
}

function relativeToProject(chosen: string, projectPath: string): string {
	if (!projectPath || !chosen.startsWith(`${projectPath}/`)) return chosen;

	return chosen.slice(projectPath.length + 1);
}

export function FolderField({
	label,
	hint,
	value,
	placeholder,
	projectPath,
	onChange,
}: Readonly<FolderFieldProps>) {
	const { t } = useTranslation();

	const browse = async () => {
		const chosen = await globalThis.lazify.chooseDiagnosticFolder(projectPath);
		if (chosen) onChange(relativeToProject(chosen, projectPath));
	};

	return (
		<LabelledField label={label} hint={hint}>
			<span className="flex items-center gap-2">
				<TextInput
					size="sm"
					value={value}
					placeholder={placeholder}
					onChange={(event) => onChange(event.target.value)}
					wrapperClassName="flex-1"
				/>
				<PanelAction
					label={t(translation.Diagnostics.Browse)}
					icon="folder"
					onClick={() => void browse()}
				/>
			</span>
		</LabelledField>
	);
}
