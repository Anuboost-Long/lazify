import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import type { AgentDescriptor } from "@/shared/lib/agents/agent-registry";
import { BodyText, SectionTitle, SmallText } from "@/shared/typography";
import UiIcon from "@/shared/ui/icons/UiIcon";

import { AgentGlyph } from "./AgentGlyph";

interface AgentNoProjectStateProps {
	agents: AgentDescriptor[];
	syncing: boolean;
	onSync: () => void;
}

export function AgentNoProjectState({ agents, syncing, onSync }: Readonly<AgentNoProjectStateProps>) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-1 items-center justify-center px-4">
			<section className="flex w-full max-w-lg flex-col items-start gap-3">
				<SectionTitle>{t(translation.Workspace.NoSyncedYet)}</SectionTitle>
				<BodyText tone="muted">{t(translation.Workspace.NoProjectsDesc)}</BodyText>

				{agents.length > 0 ? (
					<ul className="mt-1 flex flex-wrap gap-1.5">
						{agents.map((agent) => (
							<li
								key={agent.id}
								className={clsx(
									"inline-flex h-7 items-center gap-1.5 rounded-lg",
									"border border-border",
									"text-xs font-medium",
									agent.available ? "text-text" : "text-muted",
									"px-2.5",
								)}
							>
								<AgentGlyph
									agentId={agent.id}
									image={agent.image}
									className={clsx("h-3.5 w-3.5", !agent.available && "opacity-40")}
								/>
								{agent.label}
								{agent.available ? null : <span>{t(translation.Agents.NotInstalled)}</span>}
							</li>
						))}
					</ul>
				) : null}

				<div className="mt-3 flex flex-wrap items-center gap-3">
					<button
						type="button"
						disabled={syncing}
						onClick={onSync}
						className={clsx(
							"inline-flex h-10 items-center gap-2 rounded-xl",
							"bg-accent",
							"text-sm font-semibold text-white",
							"px-4",
							"transition-[background-color,transform] duration-150 hover:bg-accentHover active:scale-98",
							"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
							"disabled:cursor-not-allowed disabled:opacity-60",
							"motion-reduce:transition-none motion-reduce:active:scale-100",
						)}
					>
						<UiIcon
							name={syncing ? "refresh-circle" : "plus"}
							className={clsx("h-4 w-4", syncing && "animate-spin motion-reduce:animate-none")}
						/>
						{t(translation.Workspace.SyncProject)}
					</button>
					<SmallText>{t(translation.Agents.NoProjects)}</SmallText>
				</div>
			</section>
		</div>
	);
}
