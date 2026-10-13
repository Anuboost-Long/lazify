import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { useShownOutput } from "@/shared/terminal";
import { CaptionText } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";

interface AgentStartingProps {
	runId: string;
	agent: string;
}

export function AgentStarting({ runId, agent }: Readonly<AgentStartingProps>) {
	const { t } = useTranslation();
	const shown = useShownOutput(runId);

	if (shown) return null;

	return (
		<output className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-muted animate-appear">
			<UiIcon name="refresh-circle" className="h-3.5 w-3.5 motion-safe:animate-spin" />
			<CaptionText tone="muted">{t(translation.Agents.Starting, { agent })}</CaptionText>
		</output>
	);
}
