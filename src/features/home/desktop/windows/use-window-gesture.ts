import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";

import {
	clampFrame,
	MIN_HEIGHT,
	MIN_WIDTH,
	type DesktopBounds,
	type WindowFrame,
} from "./window-frame";

type GestureKind = "move" | "resize";

interface WindowGestureOptions {
	frame: WindowFrame;
	bounds: DesktopBounds;
	onChange: (frame: WindowFrame) => void;
}

export function useWindowGesture({ frame, bounds, onChange }: WindowGestureOptions) {
	const latest = useRef(frame);
	latest.current = frame;

	const begin = useCallback(
		(kind: GestureKind, event: ReactPointerEvent) => {
			if (event.button !== 0) return;

			event.preventDefault();

			const startX = event.clientX;
			const startY = event.clientY;
			const origin = latest.current;

			const move = (moved: PointerEvent) => {
				const dx = moved.clientX - startX;
				const dy = moved.clientY - startY;

				const next =
					kind === "move"
						? { ...origin, x: origin.x + dx, y: origin.y + dy }
						: {
								...origin,
								width: Math.max(MIN_WIDTH, origin.width + dx),
								height: Math.max(MIN_HEIGHT, origin.height + dy),
							};

				onChange(clampFrame(next, bounds));
			};

			const end = () => {
				globalThis.removeEventListener("pointermove", move);
				globalThis.removeEventListener("pointerup", end);
				globalThis.removeEventListener("pointercancel", end);
			};

			globalThis.addEventListener("pointermove", move);
			globalThis.addEventListener("pointerup", end);
			globalThis.addEventListener("pointercancel", end);
		},
		[bounds, onChange],
	);

	return {
		startMove: (event: ReactPointerEvent) => begin("move", event),
		startResize: (event: ReactPointerEvent) => begin("resize", event),
	};
}
