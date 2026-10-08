import clsx from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type {
	AgentRateLimit,
	AgentRateLimitWindow,
	AgentUsageSummary,
} from "@renderer/shared/types/lazify";
import { MonoText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

import {
	barToneClass,
	formatReset,
	formatTokens,
	remainingOf,
	STALE_READING_MS,
} from "./usage-format";

export function Stat({ label, value }: Readonly<{ label: string; value: number }>) {
	return (
		<div className="min-w-0 flex-1 px-3 py-2 first:pl-0">
			<SmallText as="span" className="!text-muted block truncate">
				{label}
			</SmallText>
			<MonoText as="span" className="!text-text block text-[11px]">
				{formatTokens(value)}
			</MonoText>
		</div>
	);
}

type UsageHistory = AgentUsageSummary["history"];

function usageTooltip(day: UsageHistory[number], tokensLabel: string): string {
	return `${day.date} · ${formatTokens(day.total)} ${tokensLabel}`;
}

export function Sparkline({
	history,
	onExpand,
}: Readonly<{ history: UsageHistory; onExpand?: () => void }>) {
	const { t } = useTranslation();
	const recent = history.slice(-14);
	const peak = Math.max(...recent.map((day) => day.total), 1);

	if (recent.length === 0) return null;

	const chart = (
		<>
			<div className="flex w-11 shrink-0 flex-col justify-between border-r border-border pr-2 text-right">
				<MonoText as="span" className="!text-muted text-[10px] leading-none">
					{formatTokens(peak)}
				</MonoText>
				<MonoText as="span" className="!text-muted text-[10px] leading-none">
					0
				</MonoText>
			</div>

			<div className="flex min-w-0 flex-1 items-end gap-[2px]">
				{recent.map((day) => (
					<Tooltip
						key={day.date}
						content={usageTooltip(day, t(translation.Agents.Tokens))}
					>
						<div
							className="h-full min-h-3 flex-1 rounded-sm bg-accent/60 hover:bg-accent"
							style={{ height: `${Math.max((day.total / peak) * 100, 4)}%` }}
						/>
					</Tooltip>
				))}
			</div>
		</>
	);

	if (!onExpand) return <div className="flex h-14 gap-2">{chart}</div>;

	return (
		<button
			type="button"
			onClick={onExpand}
			aria-label={t(translation.Agents.Usage)}
			className="flex h-14 w-full gap-2 rounded outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent"
		>
			{chart}
		</button>
	);
}

export function UsageHistoryChart({ history }: Readonly<{ history: UsageHistory }>) {
	const { t } = useTranslation();
	const peak = Math.max(...history.map((day) => day.total), 1);
	const ticks = Array.from({ length: 5 }, (_, index) => (peak * (4 - index)) / 4);
	const dateLabels = [...new Set([0, Math.floor((history.length - 1) / 2), history.length - 1])]
		.map((index) => history.at(index))
		.filter((day): day is UsageHistory[number] => day !== undefined);

	return (
		<div className="min-w-0">
			<div className="grid h-80 grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
				<div className="flex flex-col justify-between border-r border-border pr-2 text-right">
					{ticks.map((tick) => (
						<MonoText key={tick} as="span" className="!text-muted text-[10px] leading-none">
							{formatTokens(tick)}
						</MonoText>
					))}
				</div>

				<div className="relative grid min-w-0 grid-flow-col auto-cols-fr items-end gap-px">
					<div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
						{ticks.map((tick) => (
							<div key={tick} className="border-t border-border/70" />
						))}
					</div>

					{history.map((day) => (
						<Tooltip key={day.date} content={usageTooltip(day, t(translation.Agents.Tokens))}>
							<div
								className="relative min-h-1 rounded-sm bg-accent/65 transition-colors hover:bg-accent"
								style={{ height: `${Math.max((day.total / peak) * 100, day.total ? 1 : 0)}%` }}
							/>
						</Tooltip>
					))}
				</div>
			</div>

			<div className="ml-[4.25rem] mt-2 flex justify-between">
				{dateLabels.map((day) => (
					<MonoText key={day.date} as="span" className="!text-muted text-[10px]">
						{new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
					</MonoText>
				))}
			</div>
		</div>
	);
}

/** A window named by how long it runs, so a percentage says what it is about. */
export function windowLabel(window: AgentRateLimitWindow): string {
	const minutes = window.windowMinutes;

	if (!minutes) return "";
	if (minutes % (24 * 60) === 0) return `${minutes / (24 * 60)}d`;
	if (minutes % 60 === 0) return `${minutes / 60}h`;

	return `${minutes}m`;
}

export function formatResetMoment(resetsAt: string): string {
	const reset = new Date(resetsAt);

	return `${reset.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${reset.toLocaleTimeString(
		undefined,
		{ hour: "numeric", minute: "2-digit" },
	)}`;
}

export function ResetLine({ resetsAt }: Readonly<{ resetsAt: string | null }>) {
	const { t } = useTranslation();

	if (!resetsAt) return null;

	const countdown = formatReset(resetsAt);
	const countdownSuffix = countdown ? ` · ${countdown}` : "";

	return (
		<SmallText as="span" className="!text-muted mt-1.5 block truncate">
			{`${t(translation.Agents.ResetsAt)} ${formatResetMoment(resetsAt)}${countdownSuffix}`}
		</SmallText>
	);
}

export function BlockRow({ agent }: Readonly<{ agent: AgentUsageSummary }>) {
	const { t } = useTranslation();

	const block = agent.sessionWindow;
	const remainingPercent = remainingOf(block?.usedPercent ?? null);
	const leftSuffix =
		remainingPercent === null
			? ""
			: ` · ${Math.round(remainingPercent)}% ${t(translation.Agents.Left)}`;
	const windowLabel = block ? t(translation.Agents.BlockWindow) : t(translation.Agents.BlockIdle);
	const windowValue = block ? `${formatTokens(block.totals.total)}${leftSuffix}` : "—";
	const resetTooltip = block
		? `${t(translation.Agents.ResetsAt)} ${formatResetMoment(block.resetsAt)}`
		: undefined;

	return (
		<div title={resetTooltip}>
			<div className="flex items-center justify-between gap-2">
				<SmallText as="span" className="!text-muted truncate">
					{windowLabel}
				</SmallText>
				<MonoText as="span" className="!text-muted shrink-0 text-[11px]">
					{windowValue}
				</MonoText>
			</div>

			{block && remainingPercent !== null ? (
				<div className="mt-1 h-1 overflow-hidden rounded-full bg-text/10">
					<div
						className={clsx("h-full rounded-full", barToneClass(remainingPercent))}
						style={{ width: `${Math.max(remainingPercent, 2)}%` }}
					/>
				</div>
			) : null}

			{block ? <ResetLine resetsAt={block.resetsAt} /> : null}
		</div>
	);
}

export function LimitBar({
	agent,
	onSetBudget,
}: Readonly<{ agent: AgentUsageSummary; onSetBudget: (weeklyTokens: number) => void }>) {
	const { t } = useTranslation();
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");

	if (editing) {
		return (
			<form
				className="flex items-center gap-1"
				onSubmit={(event) => {
					event.preventDefault();

					onSetBudget(Math.round((Number.parseFloat(draft) || 0) * 1_000_000));
					setEditing(false);
				}}
			>
				<input
					autoFocus
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					placeholder={t(translation.Agents.BudgetPlaceholder)}
					className={clsx(
						"min-w-0 flex-1 rounded border border-border bg-text/[0.06] px-1.5 py-0.5",
						"text-[11px] text-text outline-none placeholder:text-muted",
					)}
				/>
				<IconButton
					icon="check-circle"
					type="submit"
					aria-label={t(translation.GlobalTerm.Save)}
					className="text-text"
				/>
			</form>
		);
	}

	if (!agent.rateLimit) {
		return (
			<button
				type="button"
				onClick={() => {
					setDraft("");
					setEditing(true);
				}}
				className="text-left"
			>
				<SmallText as="span" className="!text-muted hover:!text-muted">
					{t(translation.Agents.SetBudget)}
				</SmallText>
			</button>
		);
	}

	const { usedPercent, source, planType, observedAt, windows, limitReached } = agent.rateLimit;
	const observedMs = observedAt ? Date.parse(observedAt) : Number.NaN;
	const staleSince =
		source === "reported" && Number.isFinite(observedMs) && Date.now() - observedMs > STALE_READING_MS
			? formatResetMoment(observedAt)
			: null;

	return (
		<button
			type="button"
			onClick={() => {
				if (source === "budget") {
					setDraft(String((agent.weeklyBudget ?? 0) / 1_000_000));
					setEditing(true);
				}
			}}
			disabled={source === "reported"}
			title={staleSince ? `${t(translation.Agents.ReadingStale)} ${staleSince}` : undefined}
			className="w-full space-y-2 text-left disabled:cursor-default"
		>
			{windows.map((window, index) => (
				<LimitWindowRow
					key={`${window.kind}-${window.windowMinutes}`}
					window={window}
					source={source}
					plan={index === 0 ? planType : null}
					reached={limitReached && window.usedPercent === usedPercent}
					stale={staleSince !== null}
				/>
			))}
		</button>
	);
}

/**
 * One metered window. How many of these there are is the account's to say: a
 * plan that meters a rolling block alongside a weekly allowance draws two, one
 * that meters only the week draws one.
 */
function LimitWindowRow({
	window,
	source,
	plan,
	reached,
	stale,
}: Readonly<{
	window: AgentRateLimitWindow;
	source: AgentRateLimit["source"];
	plan: string | null;
	reached: boolean;
	stale: boolean;
}>) {
	const { t } = useTranslation();

	const remainingPercent = reached ? 0 : (remainingOf(window.usedPercent) ?? 0);
	const label = [
		source === "reported" ? t(translation.Agents.LimitLeft) : t(translation.Agents.BudgetLeft),
		windowLabel(window),
		plan,
	]
		.filter(Boolean)
		.join(" · ");
	const value = reached
		? t(translation.Agents.LimitReached)
		: `${Math.round(remainingPercent)}% ${t(translation.Agents.Left)}`;

	return (
		<div>
			<div className="flex items-center justify-between gap-2">
				<SmallText as="span" className="!text-muted truncate">
					{label}
				</SmallText>
				<MonoText as="span" className="!text-muted shrink-0 text-[11px]">
					{stale ? `~${value}` : value}
				</MonoText>
			</div>
			<div className="mt-1 h-1 overflow-hidden rounded-full bg-text/10">
				<div
					className={clsx("h-full rounded-full", barToneClass(remainingPercent), stale && "opacity-50")}
					style={{ width: `${Math.max(remainingPercent, 2)}%` }}
				/>
			</div>

			<ResetLine resetsAt={window.resetsAt} />
		</div>
	);
}
