import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";

import { SetupChoiceRow } from "./SetupChoiceRow";

interface SetupScriptChoicesProps {
	scripts: Record<string, string> | null;
	visibleScripts: [string, string][];
	onPickScript: (scriptName: string) => void;
}

export function SetupScriptChoices({
	scripts,
	visibleScripts,
	onPickScript,
}: Readonly<SetupScriptChoicesProps>) {
	const { t } = useTranslation();

	if (scripts === null) {
		return (
			<CaptionText tone="muted" className="px-6">
				{t(translation.GlobalTerm.Loading)}
			</CaptionText>
		);
	}

	if (Object.keys(scripts).length === 0) {
		return (
			<CaptionText tone="muted" className="px-6">
				{t(translation.Agents.MonitorNoScripts)}
			</CaptionText>
		);
	}

	return (
		<div className="flex flex-col gap-2 px-6">
			{visibleScripts.map(([name, command]) => (
				<SetupChoiceRow
					key={name}
					icon="play"
					title={name}
					subtitle={command}
					mono
					onClick={() => onPickScript(name)}
				/>
			))}
		</div>
	);
}
