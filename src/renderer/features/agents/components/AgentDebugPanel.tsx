import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { SessionPort } from "@renderer/shared/types/lazify";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import UiIcon, { type UiIconName } from "@renderer/shared/ui/icons/UiIcon";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import type { AgentTerminal } from "../hooks/agent-terminals";

interface AgentDebugPanelProps {
	terminal: AgentTerminal | null;

	runnableScript: string | null;
	onStart: () => void;
	onRestart: () => void;
	onStop: () => void;
	onClose: () => void;
}

interface ControlProps {
	icon: UiIconName;
	label: string;
	tone: "accent" | "error";
	disabled?: boolean;
	onClick: () => void;
}

function Control({ icon, label, tone, disabled = false, onClick }: Readonly<ControlProps>) {
	const toneClass = tone === "accent" ? "text-accent" : "text-error";

	return (
		<Tooltip content={label} side="top">
			<button
				type="button"
				onClick={onClick}
				disabled={disabled}
				aria-label={label}
				className={clsx(
					"flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
					"border-black/[0.06] dark:border-white/[0.06]",
					disabled
						? "cursor-not-allowed text-muted opacity-40"
						: clsx("hover:bg-text/[0.06]", toneClass),
				)}
			>
				<UiIcon name={icon} className="h-3.5 w-3.5" />
			</button>
		</Tooltip>
	);
}

function StatusRow({ label, value }: Readonly<{ label: string; value: string }>) {
	return (
		<div className="px-1.5 py-1">
			<SmallText as="span" className="!text-muted block">
				{label}
			</SmallText>
			<MonoText as="span" className="block truncate text-[11px] text-text">
				{value}
			</MonoText>
		</div>
	);
}

export function AgentDebugPanel({
	terminal,
	runnableScript,
	onStart,
	onRestart,
	onStop,
	onClose,
}: Readonly<AgentDebugPanelProps>) {
	const { t } = useTranslation();
	const [ports, setPorts] = useState<SessionPort[]>([]);
	const [pid, setPid] = useState<number | null>(null);

	const runId = terminal?.runId ?? null;
	const isRunning = Boolean(runId) && !terminal?.exited;

	useEffect(() => {
		if (!runId || !isRunning) {
			setPorts([]);
			setPid(null);
			return;
		}

		let cancelled = false;

		const read = async () => {
			const sessions = await globalThis.lazify.listSessions();
			if (cancelled) return;

			const session = sessions.find((entry) => entry.runId === runId);
			setPorts(session?.ports ?? []);
			setPid(session?.pid ?? null);
		};

		void read();
		const timer = setInterval(() => void read(), 2000);

		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [runId, isRunning]);

	return (
		<aside
			className={clsx(
				"flex w-72 shrink-0 flex-col overflow-hidden border-l border-border",
				"bg-text/[0.02]",
			)}
		>
			<header className="flex items-center gap-1 border-b border-border px-2 py-1.5">
				<UiIcon name="bug" className="ml-1 h-3.5 w-3.5 text-muted" />
				<SmallText as="span" className="!text-text truncate">
					{t(translation.Agents.Debug)}
				</SmallText>

				<div className="ml-auto flex items-center">
					<IconButton icon="xmark" aria-label={t(translation.GlobalTerm.Close)} onClick={onClose} />
				</div>
			</header>

			<div className="flex items-center gap-1 border-b border-border px-2 py-2">
				<Control
					icon="play"
					label={t(translation.Agents.DebugStart)}
					tone="accent"
					disabled={isRunning || !runnableScript}
					onClick={onStart}
				/>
				<Control
					icon="refresh-circle"
					label={t(translation.ScriptsPane.Restart)}
					tone="accent"
					disabled={!isRunning}
					onClick={onRestart}
				/>
				<Control
					icon="stop-circle"
					label={t(translation.ScriptsPane.Stop)}
					tone="error"
					disabled={!isRunning}
					onClick={onStop}
				/>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-1.5">
				{terminal ? (
					<>
						<StatusRow label={t(translation.Agents.DebugScript)} value={terminal.label} />
						<div className="px-1.5 py-1">
							<SmallText as="span" className="!text-muted block">
								{t(translation.Agents.DebugStatus)}
							</SmallText>
							<SmallText as="span" className={clsx("block", isRunning ? "!text-accent" : "!text-muted")}>
								{isRunning ? t(translation.ScriptsPane.Running) : t(translation.Agents.DebugExited)}
							</SmallText>
						</div>

						{pid ? <StatusRow label={t(translation.Agents.DebugProcess)} value={String(pid)} /> : null}

						{ports.length > 0 ? (
							<div className="px-1.5 py-1">
								<SmallText as="span" className="!text-muted block">
									{t(translation.Agents.DebugListening)}
								</SmallText>
								{ports.map((port) => (
									<MonoText
										key={`${port.address}:${port.port}`}
										as="span"
										className="block truncate text-[11px] text-text"
									>
										{`${port.address}:${port.port}`}
									</MonoText>
								))}
							</div>
						) : null}
					</>
				) : (
					<SmallText className="!text-muted px-1.5 py-2">{t(translation.Agents.DebugNoRun)}</SmallText>
				)}
			</div>
		</aside>
	);
}
