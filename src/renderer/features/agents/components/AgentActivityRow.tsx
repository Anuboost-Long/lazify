import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, SmallText } from "@renderer/shared/typography";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";

import type { AutopilotHold } from "../../../../main/agents/autopilot-policy";
import type { AgentActivityEntry, AgentActivityKind } from "../hooks/use-agent-activity";

interface AgentActivityRowProps {
	entry: AgentActivityEntry;
	/** The project the workbench is on, so its own entries read louder. */
	projectPath: string;
	onOpenRun: (entry: AgentActivityEntry) => void;
}

const HOLD_LABELS: Record<AutopilotHold, string> = {
	critical: translation.Agents.AutopilotHoldCritical,
	opinion: translation.Agents.AutopilotHoldOpinion,
	"free-text": translation.Agents.AutopilotHoldFreeText,
	"no-safe-option": translation.Agents.AutopilotHoldNoSafeOption,
	widening: translation.Agents.AutopilotHoldWidening,
	repeat: translation.Agents.AutopilotHoldRepeat,
	"rate-limit": translation.Agents.AutopilotHoldRateLimit,
	unreadable: translation.Agents.AutopilotHoldUnreadable,
};

const ICONS: Record<AgentActivityKind, UiIconName> = {
	autopilot: "shield-check",
	waiting: "bell",
	done: "check-circle",
};

const ICON_TONES: Record<AgentActivityKind, string> = {
	autopilot: "text-muted",
	waiting: "text-accent",
	done: "text-success",
};

const HEADLINES: Record<AgentActivityKind, string> = {
	autopilot: translation.Agents.AutopilotAnswered,
	waiting: translation.Agents.NeedsAttention,
	done: translation.Agents.TaskDone,
};

function timeOf(at: number) {
	return new Date(at).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function AgentActivityRow({
	entry,
	projectPath,
	onOpenRun,
}: Readonly<AgentActivityRowProps>) {
	const { t } = useTranslation();

	const waiting = entry.kind === "waiting";

	const note = () => {
		if (entry.kind === "autopilot") return entry.optionLabel;
		if (entry.hold) return t(HOLD_LABELS[entry.hold]);

		return null;
	};

	const detail = note();

	return (
		<button
			type="button"
			onClick={() => onOpenRun(entry)}
			className={clsx(
				"flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left",
				"transition-colors hover:bg-text/[0.06]",
			)}
			title={entry.question ? `${entry.question}\n${entry.projectPath}` : entry.projectPath}
		>
			<UiIcon
				name={ICONS[entry.kind]}
				className={clsx("mt-0.5 h-3.5 w-3.5 shrink-0", ICON_TONES[entry.kind])}
			/>

			<span className="min-w-0 flex-1">
				<SmallText as="span" className="!text-text block truncate">
					{t(HEADLINES[entry.kind])}
				</SmallText>

				{detail ? (
					<CaptionText tone="muted" className={clsx("block truncate", waiting && "!text-accent/80")}>
						{detail}
					</CaptionText>
				) : null}

				<SmallText
					as="span"
					className={clsx(
						"block truncate",
						entry.projectPath === projectPath ? "!text-text/70" : "!text-muted",
					)}
				>
					{`${entry.agentLabel} · ${entry.projectName}`}
				</SmallText>
			</span>

			<SmallText as="span" className="!text-muted shrink-0">
				{timeOf(entry.at)}
			</SmallText>
		</button>
	);
}
