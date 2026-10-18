import clsx from "clsx";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { useInterfaceSettings } from "@/shared/hooks/use-interface-settings";
import { BodyText, CaptionText } from "@/shared/typography";

/** Points at the element marked `data-tour={target}`; title and body are already translated. */
export interface TourStep {
	target: string;
	title: string;
	body: string;
}

const GAP = 14;
const EDGE = 12;
const RING = 6;

const targetOf = (step: TourStep) => document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);

/** Below the target when it fits, above when it does not, and never past the window's edges. */
function place(target: DOMRect, card: DOMRect) {
	const below = target.bottom + GAP;
	const top = below + card.height <= window.innerHeight - EDGE ? below : target.top - GAP - card.height;
	const centred = target.left + target.width / 2 - card.width / 2;
	const left = Math.min(Math.max(centred, EDGE), window.innerWidth - card.width - EDGE);
	return { top: Math.max(top, EDGE), left };
}

/**
 * Walks the user through a screen one element at a time, as Mneme does: the
 * element is lit and the rest dimmed, with a card saying what it is for. Steps
 * whose element is not on screen are left out.
 */
export function Tour({ steps, onClose }: Readonly<{ steps: TourStep[]; onClose: () => void }>) {
	const { t } = useTranslation();
	const { reduceMotion } = useInterfaceSettings();
	const titleId = useId();
	const bodyId = useId();
	const card = useRef<HTMLDialogElement>(null);
	const spotlight = useRef<HTMLDivElement>(null);
	const primary = useRef<HTMLButtonElement>(null);
	// Found once the page has committed, so elements drawn alongside the tour count too.
	const [shown, setShown] = useState<TourStep[] | null>(null);
	const [index, setIndex] = useState(0);
	const step = shown?.[index];
	const last = index === (shown?.length ?? 0) - 1;

	useLayoutEffect(() => setShown(steps.filter((candidate) => targetOf(candidate))), []);

	useEffect(() => {
		if (shown?.length === 0) onClose();
	}, [shown, onClose]);

	useLayoutEffect(() => {
		const target = step && targetOf(step);
		if (!target || !card.current || !spotlight.current) return;
		const tooltip = card.current;
		const highlight = spotlight.current;
		const still = reduceMotion || globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
		target.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
		primary.current?.focus({ preventScroll: true });

		function follow() {
			const rect = target!.getBoundingClientRect();
			Object.assign(highlight.style, {
				left: `${rect.left - RING}px`,
				top: `${rect.top - RING}px`,
				width: `${rect.width + RING * 2}px`,
				height: `${rect.height + RING * 2}px`,
			});
			const { top, left } = place(rect, tooltip.getBoundingClientRect());
			Object.assign(tooltip.style, { top: `${top}px`, left: `${left}px`, visibility: "visible" });
		}

		follow();
		const observer = new ResizeObserver(follow);
		observer.observe(target);
		globalThis.addEventListener("resize", follow);
		globalThis.addEventListener("scroll", follow, true);
		return () => {
			observer.disconnect();
			globalThis.removeEventListener("resize", follow);
			globalThis.removeEventListener("scroll", follow, true);
		};
	}, [step, reduceMotion]);

	useEffect(() => {
		function skipOnEscape(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		document.addEventListener("keydown", skipOnEscape);
		return () => document.removeEventListener("keydown", skipOnEscape);
	}, [onClose]);

	if (!step) return null;

	return createPortal(
		<>
			<div
				ref={spotlight}
				aria-hidden="true"
				className={clsx(
					"pointer-events-none fixed z-90 rounded-xl",
					"shadow-[0_0_0_2px_rgb(var(--lz-accent)),0_0_0_100vmax_rgb(0_0_0/0.45)]",
					"motion-safe:transition-[left,top,width,height] motion-safe:duration-200",
				)}
			/>
			<dialog
				open
				ref={card}
				aria-labelledby={titleId}
				aria-describedby={bodyId}
				className={clsx(
					"invisible fixed inset-auto z-95 m-0 w-80 p-4",
					"rounded-2xl border border-border bg-soft text-text shadow-panel",
				)}
			>
				<CaptionText tone="muted">
					{t(translation.Tour.StepCount, { current: index + 1, total: shown?.length })}
				</CaptionText>
				<BodyText as="h2" id={titleId} className="mt-1 font-semibold">
					{step.title}
				</BodyText>
				<BodyText id={bodyId} tone="muted" className="mt-1 leading-5">
					{step.body}
				</BodyText>
				<div className="mt-4 flex items-center gap-2">
					{last ? null : (
						<button
							type="button"
							onClick={onClose}
							className="mr-auto text-xs text-muted underline underline-offset-4 hover:text-text"
						>
							{t(translation.Tour.Skip)}
						</button>
					)}
					{index > 0 ? (
						<button
							type="button"
							onClick={() => setIndex(index - 1)}
							className={clsx(
								"h-8 rounded-lg border border-border px-3 text-xs font-medium text-text",
								"transition-colors hover:border-accent/40",
								last && "ml-auto",
							)}
						>
							{t(translation.GlobalTerm.Back)}
						</button>
					) : null}
					<button
						ref={primary}
						type="button"
						onClick={() => (last ? onClose() : setIndex(index + 1))}
						className={clsx(
							"h-8 rounded-lg bg-accent px-3 text-xs font-semibold text-white",
							"transition-colors hover:bg-accentHover",
							last && index === 0 && "ml-auto",
						)}
					>
						{t(last ? translation.Tour.Done : translation.Tour.Next)}
					</button>
				</div>
			</dialog>
		</>,
		document.body,
	);
}

/** Plays a tour the first time, and remembers that it has. */
export function useFirstTimeTour(key: string, ready: boolean) {
	const storageKey = `lazify-tour-${key}`;
	const [touring, setTouring] = useState(false);

	useEffect(() => {
		if (!ready) return;
		try {
			if (globalThis.localStorage.getItem(storageKey)) return;
			globalThis.localStorage.setItem(storageKey, "seen");
		} catch {
			return;
		}
		setTouring(true);
	}, [ready, storageKey]);

	const startTour = useCallback(() => setTouring(true), []);
	const endTour = useCallback(() => setTouring(false), []);

	return { touring, startTour, endTour };
}
