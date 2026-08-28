import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import type { PtySession } from "@renderer/shared/types/lazify";
import { BodyText, CardTitle, MonoText, OverlineText, PillText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { LabelButton } from "@renderer/shared/ui/LabelButton";

const POLL_INTERVAL_MS = 3000;

interface SessionRowProps {
	session: PtySession;
	killing: boolean;
	onKill: () => void;
}

function SessionRow({ session, killing, onKill }: Readonly<SessionRowProps>) {
	const { t } = useTranslation();

	const startedLabel = new Date(session.startedAt).toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<div
			className={clsx(
				// animate-fadeIn only plays on mount; keyed by runId so existing rows
				// are never remounted and never re-animate on data refresh.
				"animate-fadeIn group relative overflow-hidden rounded-2xl border",
				"border-black/[0.06] dark:border-white/[0.04] bg-soft",
				"transition-opacity duration-200",
				killing && "opacity-50",
			)}
		>
			{/* Running pulse line */}
			<div
				className="pointer-events-none absolute inset-x-0 top-0 h-px animate-pulseLine"
				style={{
					background: "linear-gradient(to right, transparent, var(--color-accent), transparent)",
				}}
			/>

			{/* Left accent rail */}
			<div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-accent/70" />

			<div className="flex flex-wrap items-center gap-3 py-3 pl-5 pr-4">
				{/* Status icon */}
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] dark:border-white/[0.04] bg-accent/10 text-accent">
					<UiIcon name="activity" className="h-3.5 w-3.5" />
				</div>

				{/* Project / script */}
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-1.5">
						<MonoText as="span" className="text-[13px] font-semibold leading-tight text-text">
							{session.projectName}
						</MonoText>
						<span className="text-[12px] text-muted">/</span>
						<MonoText as="span" className="text-[12px] leading-tight text-muted">
							{session.scriptName}
						</MonoText>
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-2">
						<PillText
							as="span"
							className="rounded-full border border-border bg-bg px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted"
						>
							PID {session.pid}
						</PillText>
						<PillText
							as="span"
							className="rounded-full border border-border bg-bg px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted"
						>
							{startedLabel}
						</PillText>
					</div>
				</div>

				{/* Port pills */}
				{session.ports.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{session.ports.map(({ port, command }) => (
							<span
								key={port}
								title={command}
								className="inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] font-semibold text-accent"
							>
								<span className="h-1.5 w-1.5 rounded-full bg-accent" />:{port}
							</span>
						))}
					</div>
				) : (
					<PillText
						as="span"
						className="rounded-full border border-border bg-bg px-2.5 py-1 text-[10px] text-muted/60"
					>
						{t(translation.SessionsPane.NoPorts)}
					</PillText>
				)}

				{/* Kill button */}
				<LabelButton
					label={translation.SessionsPane.Kill}
					icon="stop-circle"
					variant="error"
					loading={killing}
					disabled={killing}
					onClick={onKill}
				/>
			</div>
		</div>
	);
}

export function SessionsPane() {
	const { t } = useTranslation();

	const [sessions, setSessions] = useState<PtySession[]>([]);
	// firstLoad: true until the very first response arrives — controls the spinner.
	// refreshing: true only during a manual refresh — controls the button and dims
	//             existing content without unmounting it (no layout shift).
	const [firstLoad, setFirstLoad] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [killing, setKilling] = useState<Set<string>>(new Set());
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const load = useCallback(async () => {
		try {
			const result = await globalThis.lazify.listSessions();
			setSessions(result);
		} catch {
			// Non-critical — silently ignore
		}
	}, []);

	useEffect(() => {
		void load().finally(() => setFirstLoad(false));
		pollRef.current = setInterval(() => void load(), POLL_INTERVAL_MS);
		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
	}, [load]);

	const handleRefresh = async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	};

	const handleKill = async (runId: string) => {
		setKilling((prev) => new Set(prev).add(runId));
		try {
			await globalThis.lazify.stopScript(runId);
			setSessions((prev) => prev.filter((s) => s.runId !== runId));
		} finally {
			setKilling((prev) => {
				const next = new Set(prev);
				next.delete(runId);
				return next;
			});
		}
	};

	const hasActiveSessions = sessions.length > 0;

	return (
		<div className="overflow-hidden rounded-[26px] border border-border bg-bg shadow-panel">
			{/* ── Header ── */}
			<div className="flex items-center gap-2 border-b border-border bg-soft px-5 py-3.5">
				<UiIcon name="activity" className="h-4 w-4 text-muted" />
				<OverlineText className="min-w-0 flex-1 text-muted">
					{t(translation.SessionsPane.Title)}
				</OverlineText>
				<div className="flex items-center gap-2">
					{hasActiveSessions && (
						<PillText
							as="span"
							className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-2.5 py-1 text-[10px] text-accent"
						>
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
							{t(translation.SessionsPane.RunningCount, { count: sessions.length })}
						</PillText>
					)}
					<LabelButton
						label={refreshing ? translation.GlobalTerm.Scanning : translation.GlobalTerm.Refresh}
						loading={refreshing}
						disabled={refreshing || firstLoad}
						onClick={() => void handleRefresh()}
					/>
				</div>
			</div>

			<div className="p-4">
				{/* ── Spinner — only shown before the first response ever arrives ── */}
				{firstLoad && (
					<div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
						<UiIcon name="refresh-circle" className="h-4 w-4 animate-spin text-accent" />
						{t(translation.SessionsPane.Loading)}
					</div>
				)}

				{/* ── Content — mounted once and never unmounted during a refresh.
              Dims slightly while a refresh is in flight so the user knows
              an update is happening without any layout change. ── */}
				{!firstLoad && (
					<div className={clsx("transition-opacity duration-200", refreshing && "opacity-50")}>
						{!hasActiveSessions && (
							<div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-border bg-soft/30 py-12 text-center">
								<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-soft text-muted">
									<UiIcon name="terminal" className="h-6 w-6" />
								</div>
								<CardTitle className="mt-4 text-base">{t(translation.SessionsPane.EmptyTitle)}</CardTitle>
								<BodyText tone="muted" className="mt-2 max-w-xs text-sm">
									{t(translation.SessionsPane.EmptyDesc)}
								</BodyText>
							</div>
						)}

						{hasActiveSessions && (
							<div className="grid gap-1.5">
								{sessions.map((session) => (
									<SessionRow
										key={session.runId}
										session={session}
										killing={killing.has(session.runId)}
										onKill={() => void handleKill(session.runId)}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
