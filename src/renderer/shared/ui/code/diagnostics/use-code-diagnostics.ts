import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

import type { Diagnostic } from "@main/linting";

import { placeDiagnostics, type PlacedDiagnostic } from "./diagnostic-ranges";

/**
 * The squiggles, and the card that explains one.
 *
 * The underline is a CSS Custom Highlight over live ranges rather than boxes
 * laid on top: it survives scrolling, wrapping and a re-highlight without
 * anything recomputing a position, and the highlighter's own spans are left
 * exactly as they are. The registry name is styled in styles.css.
 */
const HIGHLIGHT = "code-diagnostic";

/** Long enough to move the pointer from the underline onto the card. */
const HIDE_DELAY = 120;

const supported = typeof CSS !== "undefined" && "highlights" in CSS;

/**
 * The registry is one global map keyed by name, so every surface paints into
 * the same entry. Ranges are kept per surface and unioned on each change —
 * that way two panes can each show their own findings, and a closing modal
 * takes only its own away.
 */
const painters = new Map<symbol, Range[]>();

function repaint() {
	if (!supported) return;

	const all = Array.from(painters.values()).flat();

	if (all.length === 0) CSS.highlights.delete(HIGHLIGHT);
	else CSS.highlights.set(HIGHLIGHT, new Highlight(...all));
}

export interface DiagnosticCardState {
	diagnostic: Diagnostic;
	x: number;
	y: number;
}

interface CodeDiagnostics {
	/** The painted layer: the code itself, or the underlay beneath a textarea. */
	root: RefObject<HTMLElement | null>;
	diagnostics: readonly Diagnostic[];
	/**
	 * Stands in for the painted text. The ranges point at text nodes, so they
	 * have to be rebuilt whenever the surface renders new ones.
	 */
	revision: unknown;
}

export function useCodeDiagnostics({ root, diagnostics, revision }: CodeDiagnostics) {
	const owner = useMemo(() => Symbol("code-diagnostic"), []);
	const placed = useRef<PlacedDiagnostic[]>([]);
	const [card, setCard] = useState<DiagnosticCardState | null>(null);
	const showing = useRef(false);
	const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	showing.current = card !== null;

	useEffect(() => {
		const element = root.current;

		placed.current = element && diagnostics.length ? placeDiagnostics(element, diagnostics) : [];
		painters.set(
			owner,
			placed.current.map((item) => item.range),
		);
		repaint();

		// A finding that is gone should not leave its card behind.
		setCard(null);

		return () => {
			painters.delete(owner);
			repaint();
		};
	}, [root, diagnostics, revision, owner]);

	const cancelHide = useCallback(() => {
		if (hideTimer.current === null) return;

		clearTimeout(hideTimer.current);
		hideTimer.current = null;
	}, []);

	const hide = useCallback(() => {
		cancelHide();
		if (!showing.current) return;

		hideTimer.current = globalThis.setTimeout(() => setCard(null), HIDE_DELAY);
	}, [cancelHide]);

	useEffect(() => cancelHide, [cancelHide]);

	/** The finding under a point, read off the ranges already painted. */
	const findAt = useCallback((x: number, y: number): Diagnostic | null => {
		for (const item of placed.current) {
			for (const rect of item.range.getClientRects()) {
				if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
					return item.diagnostic;
				}
			}
		}

		return null;
	}, []);

	const onPointerMove = useCallback(
		(event: { clientX: number; clientY: number }) => {
			const found = findAt(event.clientX, event.clientY);

			if (!found) {
				hide();
				return;
			}

			cancelHide();
			setCard((current) =>
				current?.diagnostic === found
					? current
					: { diagnostic: found, x: event.clientX, y: event.clientY },
			);
		},
		[cancelHide, findAt, hide],
	);

	/** Lines carrying a finding, so the gutter can mark them while scrolled. */
	const markedLines = useMemo(
		() => new Set(diagnostics.map((diagnostic) => diagnostic.line)),
		[diagnostics],
	);

	return {
		card,
		markedLines,
		onPointerMove,
		onPointerLeave: hide,
		/** The card is hovered too, so moving onto it must not dismiss it. */
		onCardEnter: cancelHide,
		onCardLeave: hide,
	};
}
