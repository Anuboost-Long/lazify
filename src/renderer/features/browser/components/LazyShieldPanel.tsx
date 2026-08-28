import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { CaptionText, CardTitle, MonoText, SmallText } from "@renderer/shared/typography";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
import { Tooltip } from "@renderer/shared/ui/Tooltip";

/**
 * Lazy Shield's toolbar control.
 *
 * A shield in the toolbar that carries the count, and a panel behind it with
 * the switch — the shape browsers have settled on for this, because the state
 * has to be readable at a glance and changeable in one click without leaving
 * the page.
 */

interface LazyShieldPanelProps {
	enabled: boolean;
	ready: boolean;
	blocked: number;
	busy: boolean;
	onToggle: (next: boolean) => void;
}

function descriptionOf(enabled: boolean, ready: boolean): string {
	if (enabled && !ready) return translation.LazyShield.Loading;
	if (enabled) return translation.LazyShield.Description;

	return translation.LazyShield.OffDescription;
}

/** The popover behind the toolbar shield: the switch, the count, the caveat. */
function ShieldCard({ enabled, ready, blocked, busy, onToggle }: Readonly<LazyShieldPanelProps>) {
	const { t } = useTranslation();

	return (
		<div
			className={clsx(
				"absolute right-0 top-9 z-30 w-72 overflow-hidden rounded-2xl",
				"border border-border bg-bg shadow-panel",
			)}
		>
			<div className="flex items-center gap-3 border-b border-border px-4 py-3">
				<span
					className={clsx(
						"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
						enabled ? "border-accent/30 bg-accent/10 text-accent" : "border-border bg-soft text-muted",
					)}
				>
					<UiIcon name={enabled ? "shield-check" : "shield-off"} className="h-4 w-4" />
				</span>

				<div className="min-w-0 flex-1">
					<CardTitle className="truncate text-sm">{t(translation.LazyShield.Title)}</CardTitle>
					<CaptionText tone="muted" className="truncate">
						{t(enabled ? translation.LazyShield.On : translation.LazyShield.Off)}
					</CaptionText>
				</div>

				{/* Switch. Native checkbox underneath so it is focusable and
            announced, with the track and knob drawn over it. */}
				<label className="relative inline-flex shrink-0 cursor-pointer items-center">
					<input
						type="checkbox"
						checked={enabled}
						disabled={busy}
						onChange={(event) => onToggle(event.target.checked)}
						className="peer sr-only"
						aria-label={t(translation.LazyShield.Toggle)}
					/>
					<span
						className={clsx(
							"h-6 w-11 rounded-full border",
							"peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40",
							busy && "opacity-60",
							enabled ? "border-accent/40 bg-accent/30" : "border-border bg-text/[0.08]",
						)}
					/>
					<span
						className={clsx(
							"pointer-events-none absolute left-0.5 h-5 w-5 rounded-full",
							"transition-transform duration-300",
							enabled ? "translate-x-5 bg-accent" : "translate-x-0 bg-muted",
						)}
					/>
				</label>
			</div>

			<div className="px-4 py-3">
				<div className="flex items-baseline gap-2">
					<MonoText as="span" className="text-2xl text-text">
						{enabled ? blocked : "—"}
					</MonoText>
					<SmallText className="!text-muted">{t(translation.LazyShield.BlockedLabel)}</SmallText>
				</div>

				<CaptionText tone="muted" className="mt-2 block leading-relaxed">
					{t(descriptionOf(enabled, ready))}
				</CaptionText>
			</div>

			{/* The one thing worth saying explicitly: this never touches the
          agent preview, so a dev server's requests are always left alone. */}
			<div className="border-t border-border bg-soft px-4 py-2.5">
				<CaptionText tone="muted" className="block leading-relaxed">
					{t(translation.LazyShield.ScopeNote)}
				</CaptionText>
			</div>
		</div>
	);
}

export function LazyShieldPanel({
	enabled,
	ready,
	blocked,
	busy,
	onToggle,
}: Readonly<LazyShieldPanelProps>) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);

	// Click-away and Escape, so the panel behaves like the popover it looks like.
	useEffect(() => {
		if (!open) return;

		const onPointerDown = (event: MouseEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};

		document.addEventListener("mousedown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div ref={rootRef} className="relative shrink-0">
			<Tooltip content={t(translation.LazyShield.Title)} side="bottom">
				<button
					type="button"
					onClick={() => setOpen((current) => !current)}
					aria-label={t(translation.LazyShield.Title)}
					aria-expanded={open}
					className={clsx(
						"flex h-7 items-center gap-1 rounded-lg px-1.5",
						"hover:bg-text/[0.06]",
						enabled ? "text-accent" : "text-muted",
						open && "bg-text/[0.08]",
					)}
				>
					<UiIcon name={enabled ? "shield-check" : "shield-off"} className="h-3.5 w-3.5" />
					{/* The count is the whole reason the icon earns toolbar space. */}
					{enabled && blocked > 0 ? (
						<MonoText as="span" className="text-[10px] text-accent">
							{blocked > 999 ? "999+" : blocked}
						</MonoText>
					) : null}
				</button>
			</Tooltip>

			{open ? (
				<ShieldCard enabled={enabled} ready={ready} blocked={blocked} busy={busy} onToggle={onToggle} />
			) : null}
		</div>
	);
}
