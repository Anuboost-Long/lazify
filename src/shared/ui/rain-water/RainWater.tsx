import { useEffect, useRef, useState } from "react";

import {
	createRainWater,
	type RainWaterColors,
	type RainWaterSettings,
} from "./rain-water-engine";

interface RainWaterProps extends Partial<RainWaterSettings> {
	/** Holds the water flat and stops the simulation, for reduced motion. */
	still?: boolean;
}

const MAX_PIXEL_RATIO = 1.5;
/** The attributes that move `--lz-bg` and `--lz-accent`, wherever in the tree they are set. */
const THEME_ATTRIBUTES = ["data-theme", "data-accent", "data-desktop-tint"];

const FALLBACK_COLORS: RainWaterColors = {
	surface: [11 / 255, 18 / 255, 32 / 255],
	highlight: [6 / 255, 182 / 255, 212 / 255],
};

function readChannels(element: Element, variable: string) {
	const channels = getComputedStyle(element).getPropertyValue(variable).trim().split(/\s+/).map(Number);
	return channels.length === 3 && channels.every(Number.isFinite)
		? (channels.map((channel) => channel / 255) as [number, number, number])
		: null;
}

/** Follows the theme background and the desktop tint, so the water matches the chrome above it. */
function readColors(element: Element): RainWaterColors {
	return {
		surface: readChannels(element, "--lz-bg") ?? FALLBACK_COLORS.surface,
		highlight: readChannels(element, "--lz-accent") ?? FALLBACK_COLORS.highlight,
	};
}

/**
 * Rain landing on a calm, dark water surface. Each drop is an impulse in a
 * heightfield; the rings are the wave equation carrying it outward.
 */
export function RainWater({
	intensity = 0.25,
	rippleStrength = 0.35,
	damping = 0.985,
	dropFrequency = 0.7,
	surfaceReflection = 0.12,
	still = false,
}: Readonly<RainWaterProps>) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const settings = useRef<RainWaterSettings>({
		intensity,
		rippleStrength,
		damping,
		dropFrequency,
		surfaceReflection,
	});
	const [contextGeneration, setContextGeneration] = useState(0);

	settings.current = { intensity, rippleStrength, damping, dropFrequency, surfaceReflection };

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const onLost = (event: Event) => event.preventDefault();
		const onRestored = () => setContextGeneration((generation) => generation + 1);
		canvas.addEventListener("webglcontextlost", onLost);
		canvas.addEventListener("webglcontextrestored", onRestored);

		let water: ReturnType<typeof createRainWater> = null;
		try {
			water = createRainWater(canvas);
		} catch {
			// A driver that rejects the shaders leaves the plain background showing.
		}
		if (!water) {
			return () => {
				canvas.removeEventListener("webglcontextlost", onLost);
				canvas.removeEventListener("webglcontextrestored", onRestored);
			};
		}

		let colors = readColors(canvas);
		let lastTime: number | null = null;
		let frameId = 0;

		const observer = new ResizeObserver(([entry]) => {
			water.resize(
				entry.contentRect.width,
				entry.contentRect.height,
				Math.min(globalThis.devicePixelRatio || 1, MAX_PIXEL_RATIO),
			);
			if (still) water.draw(settings.current, colors);
		});
		observer.observe(canvas);

		// Re-read the moment the theme or tint changes: the text above flips on the
		// same frame, and water still in the old theme swallows it until it catches up.
		const themeObserver = new MutationObserver(() => {
			colors = readColors(canvas);
			if (still) water.draw(settings.current, colors);
		});
		themeObserver.observe(document.documentElement, {
			attributes: true,
			subtree: true,
			attributeFilter: THEME_ATTRIBUTES,
		});

		const tick = (time: number) => {
			const elapsed = lastTime === null ? 0 : (time - lastTime) / 1000;
			lastTime = time;

			water.frame(elapsed, settings.current, colors);
			frameId = requestAnimationFrame(tick);
		};
		if (!still) frameId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frameId);
			observer.disconnect();
			themeObserver.disconnect();
			canvas.removeEventListener("webglcontextlost", onLost);
			canvas.removeEventListener("webglcontextrestored", onRestored);
			water.dispose();
		};
	}, [still, contextGeneration]);

	return (
		<div aria-hidden="true" className="pointer-events-none absolute inset-0">
			<canvas ref={canvasRef} className="block h-full w-full" />
		</div>
	);
}
