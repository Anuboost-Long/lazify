import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { translation } from "@/i18n/translation";
import { CaptionText } from "@/shared/typography";

import { MAX_FOCUS_MINUTES, MIN_FOCUS_MINUTES } from "./use-focus-timer";

const ROW = 32;
const VISIBLE_ROWS = 5;
const PAD = ROW * Math.floor(VISIBLE_ROWS / 2);
const SETTLE_MS = 120;
const OPTIONS = Array.from(
	{ length: MAX_FOCUS_MINUTES - MIN_FOCUS_MINUTES + 1 },
	(_, index) => MIN_FOCUS_MINUTES + index,
);

interface FocusLengthPickerProps {
	minutes: number;
	/** The control that opened it: the picker opens beneath it, and pressing it again is not "outside". */
	anchor: HTMLElement;
	onChange: (minutes: number) => void;
	onClose: () => void;
}

/**
 * The focus length, typed or turned on a wheel. Both write the same value; the
 * wheel snaps to the row in its middle band and commits once it stops moving.
 */
export function FocusLengthPicker({ minutes, anchor, onChange, onClose }: Readonly<FocusLengthPickerProps>) {
	const { t } = useTranslation();
	const inputId = useId();
	const popover = useRef<HTMLDivElement>(null);
	const wheel = useRef<HTMLDivElement>(null);
	const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [draft, setDraft] = useState(String(minutes));
	const [centred, setCentred] = useState(minutes);

	const scrollTo = (value: number, smooth: boolean) =>
		wheel.current?.scrollTo({ top: (value - MIN_FOCUS_MINUTES) * ROW, behavior: smooth ? "smooth" : "auto" });

	useLayoutEffect(() => {
		scrollTo(minutes, false);
		// Opens on the current value only; later changes come from the wheel itself.
	}, []);

	useEffect(() => {
		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === "Escape") onClose();
		}
		function closeOutside(event: PointerEvent) {
			const target = event.target as Node;
			if (!popover.current?.contains(target) && !anchor.contains(target)) onClose();
		}
		document.addEventListener("keydown", closeOnEscape);
		document.addEventListener("pointerdown", closeOutside);
		return () => {
			document.removeEventListener("keydown", closeOnEscape);
			document.removeEventListener("pointerdown", closeOutside);
			if (settle.current) clearTimeout(settle.current);
		};
	}, [anchor, onClose]);

	function onWheelScroll() {
		const top = wheel.current?.scrollTop ?? 0;
		const value = Math.min(MAX_FOCUS_MINUTES, MIN_FOCUS_MINUTES + Math.round(top / ROW));
		setCentred(value);
		setDraft(String(value));
		if (settle.current) clearTimeout(settle.current);
		settle.current = setTimeout(() => onChange(value), SETTLE_MS);
	}

	function commitDraft() {
		const typed = Number.parseInt(draft, 10);
		if (Number.isNaN(typed)) {
			setDraft(String(centred));
			return;
		}
		const value = Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, typed));
		setDraft(String(value));
		setCentred(value);
		scrollTo(value, true);
		onChange(value);
	}

	const width = 176;
	const rect = anchor.getBoundingClientRect();
	const left = Math.min(Math.max(rect.right - width, 12), globalThis.innerWidth - width - 12);

	return createPortal(
		<div
			ref={popover}
			style={{ top: rect.bottom + 8, left, width }}
			className={clsx("fixed z-60 p-3", "rounded-2xl border border-border bg-soft shadow-panel")}
		>
			<label htmlFor={inputId} className="flex items-center justify-between gap-2">
				<CaptionText as="span" tone="muted">
					{t(translation.Home.TimerMinutes)}
				</CaptionText>
				<input
					id={inputId}
					type="number"
					inputMode="numeric"
					min={MIN_FOCUS_MINUTES}
					max={MAX_FOCUS_MINUTES}
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onBlur={commitDraft}
					onKeyDown={(event) => {
						if (event.key === "Enter") commitDraft();
					}}
					className={clsx(
						"h-8 w-16 rounded-lg border border-border bg-bg px-2",
						"text-right text-sm tabular-nums text-text",
						"focus-visible:border-accent focus-visible:outline-hidden",
					)}
				/>
			</label>

			<div className="relative mt-3" aria-hidden="true">
				<div
					className="pointer-events-none absolute inset-x-0 rounded-lg bg-accent/10"
					style={{ top: PAD, height: ROW }}
				/>
				<div
					ref={wheel}
					onScroll={onWheelScroll}
					style={{ height: ROW * VISIBLE_ROWS, paddingBlock: PAD }}
					className={clsx(
						"relative snap-y snap-mandatory overflow-y-auto overscroll-contain",
						"scrollbar-none [&::-webkit-scrollbar]:hidden",
						"mask-[linear-gradient(transparent,black_35%,black_65%,transparent)]",
					)}
				>
					{OPTIONS.map((option) => (
						<button
							key={option}
							type="button"
							tabIndex={-1}
							onClick={() => scrollTo(option, true)}
							style={{ height: ROW }}
							className={clsx(
								"block w-full snap-center text-center tabular-nums transition-colors",
								option === centred ? "text-base font-semibold text-accent" : "text-sm text-muted",
							)}
						>
							{option}
						</button>
					))}
				</div>
			</div>
		</div>,
		document.body,
	);
}
