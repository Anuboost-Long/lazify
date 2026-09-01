import { useTranslation } from "react-i18next";

import type { LiveAgentSession } from "@renderer/features/agents/hooks/use-live-agent-sessions";
import { XTermPanel } from "@renderer/features/workspace/components/XTermPanel";
import { translation } from "@renderer/i18n/translation";
import { CaptionText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

interface LiveAgentPanelProps {
	session: LiveAgentSession | null;
	onOpenAgents: (projectPath: string) => void;
}

export function LiveAgentPanel({ session, onOpenAgents }: Readonly<LiveAgentPanelProps>) {
	const { t } = useTranslation();

	if (!session) {
		return (
			<div className="px-5 py-10 text-center">
				<UiIcon name="radar" className="mx-auto h-6 w-6 text-muted" />
				<CaptionText tone="muted" className="mt-3">
					{t(translation.Home.AgentSessionEnded)}
				</CaptionText>
			</div>
		);
	}

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex shrink-0 items-center gap-2 border-b border-border px-2.5 py-1.5">
				<CaptionText tone="muted" className="min-w-0 flex-1 truncate">
					{session.projectName}
				</CaptionText>

				{session.waiting ? (
					<span className="flex shrink-0 items-center gap-1.5">
						<span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
						<CaptionText className="!text-accent">{t(translation.Agents.NeedsAttention)}</CaptionText>
					</span>
				) : null}

				<IconButton
					icon="open-new-window"
					title={t(translation.Home.OpenInAgents)}
					aria-label={t(translation.Home.OpenInAgents)}
					onClick={() => onOpenAgents(session.projectPath)}
				/>
			</div>

			<div className="min-h-0 flex-1 bg-terminal p-1.5">
				<XTermPanel runId={session.runId} isActive />
			</div>
		</div>
	);
}
