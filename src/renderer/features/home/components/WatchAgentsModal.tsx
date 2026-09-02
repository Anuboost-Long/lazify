import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { SetupChoiceRow } from "@renderer/features/agents/components/monitor/SetupChoiceRow";
import type { LiveAgentSession } from "@renderer/features/agents/hooks/use-live-agent-sessions";
import { translation } from "@renderer/i18n/translation";
import { BodyText, OverlineText, SectionTitle } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";

interface WatchAgentsModalProps {
	open: boolean;
	sessions: LiveAgentSession[];
	onWatch: (runId: string) => void;
	onOpenAgents: () => void;
	onClose: () => void;
}

export function WatchAgentsModal({
	open,
	sessions,
	onWatch,
	onOpenAgents,
	onClose,
}: Readonly<WatchAgentsModalProps>) {
	const { t } = useTranslation();

	return (
		<BaseModal open={open} onClose={onClose}>
			<div
				className={clsx(
					"flex max-h-[min(36rem,88vh)] w-[440px] max-w-[calc(100vw-2rem)] flex-col",
					"overflow-hidden rounded-shell border border-border bg-soft shadow-panel",
				)}
			>
				<header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 pb-4 pt-5">
					<div>
						<OverlineText className="text-muted">{t(translation.Navigation.Agents)}</OverlineText>
						<SectionTitle className="mt-1 text-xl">
							{t(translation.Home.AgentsRunning, { count: sessions.length })}
						</SectionTitle>
						<BodyText className="mt-1 text-xs text-muted">
							{t(translation.Home.AgentsRunningDesc)}
						</BodyText>
					</div>

					<button
						type="button"
						onClick={onClose}
						aria-label={t(translation.GlobalTerm.Close)}
						className={clsx(
							"shrink-0 rounded-xl border border-border bg-bg p-2 transition-colors duration-150",
							"text-muted hover:border-accent/30 hover:text-text",
						)}
					>
						<UiIcon name="xmark" className="h-4 w-4" />
					</button>
				</header>

				<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-5">
					<OverlineText className="text-muted">{t(translation.Home.WatchHere)}</OverlineText>

					{sessions.map((session) => (
						<SetupChoiceRow
							key={session.runId}
							emphasis={session.waiting}
							icon="terminal"
							title={session.label}
							subtitle={
								session.waiting
									? t(translation.Agents.NeedsAttention)
									: `${session.projectName} · ${t(translation.Agents.Running)}`
							}
							onClick={() => onWatch(session.runId)}
						/>
					))}
				</div>

				<div className="shrink-0 border-t border-border p-5">
					<SetupChoiceRow
						icon="code"
						title={t(translation.Home.GoToAgents)}
						subtitle={t(translation.Home.GoToAgentsDesc)}
						onClick={onOpenAgents}
					/>
				</div>
			</div>
		</BaseModal>
	);
}
