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
const WIDTH = 224;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute);

const clampTotal = (total: number) => Math.min(MAX_FOCUS_MINUTES, Math.max(MIN_FOCUS_MINUTES, total));

interface WheelProps {
	values: number[];
	value: number;
	unit: string;
	onSettle: (value: number) => void;
}

/** A column that snaps to the row in its middle band and reports it once it stops moving. */
function Wheel({ values, value, unit, onSettle }: Readonly<WheelProps>) {
	const wheel = useRef<HTMLDivElement>(null);
	const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [centred, setCentred] = useState(value);

	const scrollTo = (target: number, smooth: boolean) =>
		wheel.current?.scrollTo({ top: values.indexOf(target) * ROW, behavior: smooth ? "smooth" : "auto" });

	useLayoutEffect(() => {
		scrollTo(value, false);
		// Opens on the current value; later moves follow `value` below.
	}, []);

	// A typed value moves the wheel; the wheel's own settling arrives here already centred.
	useEffect(() => {
		if (value === centred) return;
		setCentred(value);
		scrollTo(value, true);
	}, [value]);

	useEffect(
		() => () => {
			if (settle.current) clearTimeout(settle.current);
		},
		[],
	);

	function onScroll() {
		const index = Math.round((wheel.current?.scrollTop ?? 0) / ROW);
		const next = values[Math.min(values.length - 1, Math.max(0, index))];
		setCentred(next);
		if (settle.current) clearTimeout(settle.current);
		settle.current = setTimeout(() => onSettle(next), SETTLE_MS);
	}

	return (
		<div className="relative flex-1">
			<div
				ref={wheel}
				onScroll={onScroll}
				style={{ height: ROW * VISIBLE_ROWS, paddingBlock: PAD }}
				className={clsx(
					"relative snap-y snap-mandatory overflow-y-auto overscroll-contain",
					"scrollbar-none [&::-webkit-scrollbar]:hidden",
					"mask-[linear-gradient(transparent,black_35%,black_65%,transparent)]",
				)}
			>
				{values.map((option) => (
					<button
						key={option}
						type="button"
						tabIndex={-1}
						onClick={() => scrollTo(option, true)}
						style={{ height: ROW }}
						className={clsx(
							"block w-full snap-center pr-7 text-right tabular-nums transition-colors",
							option === centred ? "text-lg font-semibold text-text" : "text-sm text-muted",
						)}
					>
						{option}
					</button>
				))}
			</div>
			<CaptionText
				as="span"
				tone="muted"
				className="pointer-events-none absolute right-1 -translate-y-1/2"
				style={{ top: PAD + ROW / 2 }}
			>
				{unit}
			</CaptionText>
		</div>
	);
}

interface FieldProps {
	label: string;
	value: number;
	max: number;
	onCommit: (value: number) => void;
}

/** The typed counterpart of a wheel, and the control keyboard and screen-reader users get. */
function Field({ label, value, max, onCommit }: Readonly<FieldProps>) {
	const id = useId();
	const [draft, setDraft] = useState(String(value));

	useEffect(() => setDraft(String(value)), [value]);

	function commit() {
		const typed = Number.parseInt(draft, 10);
		if (Number.isNaN(typed)) {
			setDraft(String(value));
			return;
		}
		onCommit(Math.min(max, Math.max(0, typed)));
	}

	return (
		<label htmlFor={id} className="flex flex-1 items-center gap-1.5">
			<input
				id={id}
				type="number"
				inputMode="numeric"
				min={0}
				max={max}
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === "Enter") commit();
				}}
				className={clsx(
					"h-8 w-full min-w-0 rounded-lg border border-border bg-bg px-2",
					"text-right text-sm tabular-nums text-text",
					"focus-visible:border-accent focus-visible:outline-hidden",
				)}
			/>
			<CaptionText as="span" tone="muted">
				{label}
			</CaptionText>
		</label>
	);
}

interface FocusLengthPickerProps {
	minutes: number;
	/** The control that opened it: the picker opens beneath it, and pressing it again is not "outside". */
	anchor: HTMLElement;
	onChange: (minutes: number) => void;
	onClose: () => void;
}

/** Hours and minutes, on wheels as a timer app has them, or typed. */
export function FocusLengthPicker({ minutes, anchor, onChange, onClose }: Readonly<FocusLengthPickerProps>) {
	const { t } = useTranslation();
	const popover = useRef<HTMLDivElement>(null);
	const [total, setTotal] = useState(minutes);
	const hours = Math.floor(total / 60);
	const rest = total % 60;

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
		};
	}, [anchor, onClose]);

	// 0 h 0 m is not a length, so it becomes the shortest one.
	function apply(nextHours: number, nextMinutes: number) {
		const next = clampTotal(nextHours * 60 + nextMinutes);
		setTotal(next);
		onChange(next);
	}

	const rect = anchor.getBoundingClientRect();
	const left = Math.min(Math.max(rect.right - WIDTH, 12), globalThis.innerWidth - WIDTH - 12);

	return createPortal(
		<div
			ref={popover}
			style={{ top: rect.bottom + 8, left, width: WIDTH }}
			className={clsx("fixed z-60 p-3", "rounded-2xl border border-border bg-soft shadow-panel")}
		>
			<div className="flex items-center gap-3">
				<Field label={t(translation.Home.TimerHours)} value={hours} max={23} onCommit={(h) => apply(h, rest)} />
				<Field label={t(translation.Home.TimerMinutes)} value={rest} max={59} onCommit={(m) => apply(hours, m)} />
			</div>

			<div className="relative mt-3 flex" aria-hidden="true">
				<div
					className="pointer-events-none absolute inset-x-0 rounded-lg bg-accent/10"
					style={{ top: PAD, height: ROW }}
				/>
				<Wheel values={HOURS} value={hours} unit={t(translation.Home.TimerHoursUnit)} onSettle={(h) => apply(h, rest)} />
				<Wheel values={MINUTES} value={rest} unit={t(translation.Home.TimerMinutesUnit)} onSettle={(m) => apply(hours, m)} />
			</div>
		</div>,
		document.body,
	);
}
