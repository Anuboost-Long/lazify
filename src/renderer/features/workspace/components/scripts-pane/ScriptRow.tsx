import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { MonoText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { LabelButton } from "@renderer/shared/ui/LabelButton";

interface ScriptRowProps {
	name: string;
	command: string;
	isRunningHere: boolean; // this script is the one running in the active tab
	isDisabled: boolean; // active tab is busy with a different script
	onRun: () => void;
	onStop: () => void;
	onRestart: () => void;
}

export function ScriptRow({
	name,
	command,
	isRunningHere,
	isDisabled,
	onRun,
	onStop,
	onRestart,
}: Readonly<ScriptRowProps>) {
	const { t } = useTranslation();
	return (
		<div
			className={clsx(
				"group relative w-full overflow-hidden rounded-2xl border",
				"border-black/[0.06] dark:border-white/[0.04] bg-soft",
			)}
		>
			{isRunningHere && (
				<div
					className="pointer-events-none absolute inset-x-0 top-0 h-px animate-pulseLine"
					style={{
						background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
					}}
				/>
			)}
			<div
				className={clsx(
					"pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r-full transition-colors duration-300",
					isRunningHere ? "bg-accent" : "bg-border/30 group-hover:bg-border/60",
				)}
			/>

			<div className="flex items-center gap-3 px-4 py-3 pl-5">
				<div
					className={clsx(
						"flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200",
						"border-black/[0.06] dark:border-white/[0.04]",
						isRunningHere ? "bg-accent/10 text-accent" : "bg-bg text-muted",
					)}
				>
					{isRunningHere ? (
						<UiIcon name="refresh-circle" className="h-3.5 w-3.5 animate-spin" />
					) : (
						<UiIcon name="play" className="h-3.5 w-3.5" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<MonoText as="span" className="block text-[13px] font-semibold leading-tight text-text">
						{name}
					</MonoText>
					<MonoText as="span" className="mt-0.5 block truncate text-[11px] leading-tight text-muted">
						{command}
					</MonoText>
				</div>

				{isRunningHere && (
					<PillText
						as="span"
						className="shrink-0 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-accent"
					>
						{t(translation.ScriptsPane.Running)}
					</PillText>
				)}

				{isRunningHere ? (
					<>
						<LabelButton
							label={translation.ScriptsPane.Restart}
							icon="refresh-circle"
							variant="accent"
							onClick={onRestart}
						/>
						<LabelButton
							label={translation.ScriptsPane.Stop}
							icon="stop-circle"
							variant="error"
							onClick={onStop}
						/>
					</>
				) : (
					<LabelButton
						label={translation.ScriptsPane.Run}
						icon="play"
						variant="accent"
						disabled={isDisabled}
						onClick={onRun}
					/>
				)}
			</div>
		</div>
	);
}
