import { useEffect, useRef, useState, type RefObject } from "react";

interface CursorBackdropProps {
	surface: RefObject<HTMLElement | null>;
	still: boolean;
}

export function CursorBackdrop({ surface, still }: Readonly<CursorBackdropProps>) {
	const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
	const frame = useRef<number | null>(null);

	useEffect(() => {
		const element = surface.current;
		if (!element || still) return;

		const onMove = (event: PointerEvent) => {
			if (frame.current !== null) return;

			frame.current = requestAnimationFrame(() => {
				frame.current = null;

				const bounds = element.getBoundingClientRect();
				setPoint({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
			});
		};

		const onLeave = () => setPoint(null);

		element.addEventListener("pointermove", onMove);
		element.addEventListener("pointerleave", onLeave);

		return () => {
			element.removeEventListener("pointermove", onMove);
			element.removeEventListener("pointerleave", onLeave);
			if (frame.current !== null) cancelAnimationFrame(frame.current);
		};
	}, [surface, still]);

	return (
		<div aria-hidden="true" className="absolute inset-0 overflow-hidden">
			<div
				style={{
					left: point?.x ?? "50%",
					top: point?.y ?? "50%",
					opacity: still || point ? 1 : 0.35,
				}}
				className="absolute h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl transition-opacity duration-500"
			/>
			<div
				style={{ left: point?.x ?? "50%", top: point?.y ?? "50%" }}
				className="absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-2xl"
			/>
		</div>
	);
}
