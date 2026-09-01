import { useCallback, useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";

import { symbolHitAtPoint, type SymbolPosition } from "../symbol-at-point";

/**
 * Holding the modifier turns names into links.
 *
 * The whole interaction lives here — which key counts, what is lit while it is
 * held, and what a click on a lit word means — because none of it is worth
 * anything on its own. The surface only paints the boxes and forwards events.
 */

/** Cmd on macOS, Ctrl everywhere else — the split every editor uses for this. */
const IS_MAC = navigator.userAgent.includes("Mac OS X");

const holdsModifier = (event: { metaKey: boolean; ctrlKey: boolean }) =>
	IS_MAC ? event.metaKey : event.ctrlKey;

/** Where a link cue goes, in the code column's own scrolled coordinates. */
export interface LinkBox {
	left: number;
	top: number;
	width: number;
	height: number;
}

function sameBoxes(a: LinkBox[] | null, b: LinkBox[]): boolean {
	if (!a || a.length !== b.length) return false;

	return a.every(
		(box, index) =>
			box.left === b[index].left &&
			box.top === b[index].top &&
			box.width === b[index].width &&
			box.height === b[index].height,
	);
}

interface SymbolLink {
	code: RefObject<HTMLPreElement | null>;
	onOpenSymbol?: (symbol: string, position?: SymbolPosition) => void;
}

export function useSymbolLink({ code, onOpenSymbol }: SymbolLink) {
	/**
	 * The word the modifier-held pointer is over. Null whenever the key is up,
	 * so ordinary reading and selecting look exactly as they did.
	 */
	const [boxes, setBoxes] = useState<LinkBox[] | null>(null);
	/** Last seen pointer, so pressing the key without moving still lights a word. */
	const pointer = useRef<{ x: number; y: number } | null>(null);

	const clear = useCallback(() => setBoxes(null), []);

	const paint = useCallback(
		(x: number, y: number, held: boolean) => {
			const pre = code.current;
			if (!onOpenSymbol || !pre || !held) {
				setBoxes(null);
				return;
			}

			const hit = symbolHitAtPoint(x, y);
			// The caret API answers for whatever is under the point, which may be a
			// pane stacked over this one.
			if (!hit || !pre.contains(hit.range.startContainer)) {
				setBoxes(null);
				return;
			}

			// Client rects are viewport-relative and the cue is drawn inside the
			// scroller, so it is put back into content coordinates — that way it
			// stays on its word while the code scrolls under it.
			const frame = pre.getBoundingClientRect();
			const measured = Array.from(hit.range.getClientRects(), (rect) => ({
				left: rect.left - frame.left + pre.scrollLeft,
				top: rect.top - frame.top + pre.scrollTop,
				width: rect.width,
				height: rect.height,
			}));

			// Held down, the pointer moves across the same word many times over. Only
			// a cue that actually moved is worth a render of the whole listing.
			const next = measured.length ? measured : null;
			setBoxes((current) => (next && sameBoxes(current, next) ? current : next));
		},
		[code, onOpenSymbol],
	);

	// The key is watched on the window rather than the surface: it is pressed and
	// released while the pointer rests on a word, and a blur — cmd-tab away, for
	// one — never sends the keyup that would otherwise leave a word lit.
	useEffect(() => {
		if (!onOpenSymbol) return;

		const onKey = (event: KeyboardEvent) => {
			const at = pointer.current;
			if (!at) return;
			paint(at.x, at.y, holdsModifier(event));
		};

		globalThis.addEventListener("keydown", onKey);
		globalThis.addEventListener("keyup", onKey);
		globalThis.addEventListener("blur", clear);

		return () => {
			globalThis.removeEventListener("keydown", onKey);
			globalThis.removeEventListener("keyup", onKey);
			globalThis.removeEventListener("blur", clear);
		};
	}, [onOpenSymbol, paint, clear]);

	const onMouseMove = useCallback(
		(event: MouseEvent<HTMLPreElement>) => {
			pointer.current = { x: event.clientX, y: event.clientY };
			paint(event.clientX, event.clientY, holdsModifier(event));
		},
		[paint],
	);

	const onMouseLeave = useCallback(() => {
		pointer.current = null;
		setBoxes(null);
	}, []);

	const onClick = useCallback(
		(event: MouseEvent<HTMLPreElement>) => {
			if (!onOpenSymbol) return;

			// Held, the way an editor asks: a bare click still belongs to reading and
			// selecting, and only the modifier turns a name into a link.
			if (!holdsModifier(event)) return;

			// A drag that selected text was after the text, not a jump.
			const selection = globalThis.getSelection();
			if (selection && !selection.isCollapsed) return;

			const hit = symbolHitAtPoint(event.clientX, event.clientY);
			if (!hit) return;

			// The cue belongs to the word that was here; the jump replaces what is
			// under the pointer, so it goes with it.
			setBoxes(null);
			onOpenSymbol(hit.symbol, hit.position);
		},
		[onOpenSymbol],
	);

	return { boxes, clear, onClick, onMouseLeave, onMouseMove };
}
