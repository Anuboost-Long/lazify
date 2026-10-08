import { useCallback, useEffect, useRef, useState } from "react";

const TERM_HEIGHT_KEY = "lazify-terminal-height";
const MIN_TERM_HEIGHT = 160;
const MAX_TERM_HEIGHT = 900;
const DEFAULT_TERM_HEIGHT = 384;

/**
 * The height of the terminal panel, dragged by the handle beneath it.
 *
 * Kept in localStorage rather than component state alone: the pane is torn down
 * whenever the project page is left, and a terminal that sprang back to its
 * default size on every return would be worth less than one that stayed where
 * it was put.
 */
export function useTerminalHeight() {
	const [height, setHeight] = useState<number>(() => {
		const stored = Number(localStorage.getItem(TERM_HEIGHT_KEY));
		return stored >= MIN_TERM_HEIGHT ? Math.min(stored, MAX_TERM_HEIGHT) : DEFAULT_TERM_HEIGHT;
	});
	const [isDragging, setIsDragging] = useState(false);
	const dragStartRef = useRef<{ y: number; h: number } | null>(null);
	const heightRef = useRef(height);
	useEffect(() => {
		heightRef.current = height;
	}, [height]);

	/** The keyboard's equivalent of a drag, one nudge at a time. */
	const resizeBy = useCallback((delta: number) => {
		const next = Math.min(MAX_TERM_HEIGHT, Math.max(MIN_TERM_HEIGHT, heightRef.current + delta));

		heightRef.current = next;
		setHeight(next);
		localStorage.setItem(TERM_HEIGHT_KEY, String(next));
	}, []);

	const onDragStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		dragStartRef.current = { y: e.clientY, h: heightRef.current };
		setIsDragging(true);
	}, []);

	useEffect(() => {
		if (!isDragging) return;
		const onMove = (e: MouseEvent) => {
			if (!dragStartRef.current) return;
			setHeight(
				Math.min(
					MAX_TERM_HEIGHT,
					Math.max(MIN_TERM_HEIGHT, dragStartRef.current.h + (e.clientY - dragStartRef.current.y)),
				),
			);
		};
		const onUp = () => {
			setIsDragging(false);
			localStorage.setItem(TERM_HEIGHT_KEY, String(heightRef.current));
			document.body.style.cursor = "";
		};
		document.body.style.cursor = "ns-resize";
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);
		return () => {
			document.removeEventListener("mousemove", onMove);
			document.removeEventListener("mouseup", onUp);
			document.body.style.cursor = "";
		};
	}, [isDragging]);

	return { height, isDragging, onDragStart, resizeBy };
}
