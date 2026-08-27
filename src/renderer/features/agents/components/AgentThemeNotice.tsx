import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { useResolvedTheme } from "@renderer/shared/hooks/use-theme";
import { CaptionText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

import { restartAgentSession, type RestartableSession } from "../hooks/restart-agent-session";
import { useSchemeStale } from "../hooks/use-scheme-stale";

interface AgentThemeNoticeProps {
	session: RestartableSession;
	/** What this agent is called wherever it is being shown. */
	label: string;
	/** Tighter, for a monitor cell with far less room than a workspace tab. */
	compact?: boolean;
}

/**
 * Says when an agent is still painting for the theme it opened in.
 *
 * An agent reads the terminal's colours once, when it starts. The ones that ask
 * to be told about a change are told, and never get this far; the rest keep the
 * palette they chose, which after a switch means light diffs on a dark panel.
 *
 * Nothing can be said to a session that is not listening, so the offer is the
 * one thing that does work: run it again, in place, carrying the conversation
 * over. Nothing closes.
 *
 * Written out rather than left to an icon: a lone refresh button in a header
 * says "reload", which is not what this is about.
 */
export function AgentThemeNotice({ session, label, compact }: Readonly<AgentThemeNoticeProps>) {
	const { t } = useTranslation();
	const theme = useResolvedTheme();
	const stale = useSchemeStale(session.runId);
	const [restarting, setRestarting] = useState(false);

	if (session.kind !== "agent" || !stale) return null;

	return (
		<div
			className={clsx(
				"flex flex-wrap items-center rounded-lg border border-border bg-soft",
				compact ? "mb-1.5 gap-x-2 px-2 py-1" : "mb-2 gap-x-3 px-3 py-1.5",
				"gap-y-1",
			)}
		>
			{/* The theme it is out of step with, rather than a warning: nothing is broken. */}
			<UiIcon name={theme === "dark" ? "moon" : "sun"} className="h-3.5 w-3.5 shrink-0 text-muted" />

			<CaptionText tone="muted" className="min-w-0 flex-1">
				{t(translation.Agents.ThemeStale, { agent: label })}
			</CaptionText>

			<button
				type="button"
				disabled={restarting}
				onClick={() => {
					setRestarting(true);
					void restartAgentSession(session).finally(() => setRestarting(false));
				}}
				className="shrink-0 rounded-md px-2 py-0.5 text-[11px] text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{t(restarting ? translation.Agents.ThemeRestarting : translation.Agents.ThemeRestart)}
			</button>
		</div>
	);
}
