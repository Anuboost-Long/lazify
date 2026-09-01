import clsx from "clsx";
import { useState } from "react";

const DROP_COUNT = 6;

interface Drop {
	x: number;
	y: number;
	size: number;
	deep: boolean;
}

/** Kept off the very edge, where half a ring reads as a crop rather than a drop. */
function land(): Drop {
	return {
		x: 8 + Math.random() * 84,
		y: 10 + Math.random() * 80,
		size: 220 + Math.random() * 260,
		deep: Math.random() > 0.5,
	};
}

export function PulseBackdrop({ still }: Readonly<{ still: boolean }>) {
	const [drops, setDrops] = useState<Drop[]>(() => Array.from({ length: DROP_COUNT }, land));
	/**
	 * Fixed once: `animation-delay` only holds back the first pass, so staggering
	 * here is what keeps the drops from falling in step, and never changing it
	 * means a ring is never restarted mid-flight.
	 */
	const [delays] = useState<number[]>(() =>
		Array.from({ length: DROP_COUNT }, (_, index) => (index * 9) / DROP_COUNT + Math.random()),
	);

	const fall = (index: number) =>
		setDrops((current) => current.map((drop, at) => (at === index ? land() : drop)));

	return (
		<div aria-hidden="true" className="absolute inset-0 overflow-hidden">
			<div className="absolute inset-0 bg-gradient-to-b from-accent/5 via-transparent to-accentHover/5" />

			{drops.map((drop, index) => {
				const at = {
					left: `${drop.x}%`,
					top: `${drop.y}%`,
					width: drop.size,
					height: drop.size,
				};

				return (
					<span key={index} className="contents">
						<span
							onAnimationIteration={still ? undefined : () => fall(index)}
							style={{ ...at, ...(still ? { opacity: 0.35 } : { animationDelay: `${delays[index]}s` }) }}
							className={clsx(
								"absolute -translate-x-1/2 -translate-y-1/2 rounded-full border",
								drop.deep ? "border-accentHover" : "border-accent",
								!still && "animate-ripple opacity-0",
							)}
						/>
						<span
							style={{ ...at, ...(still ? { opacity: 0.15 } : { animationDelay: `${delays[index]}s` }) }}
							className={clsx(
								"absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-md",
								drop.deep ? "bg-accentHover/40" : "bg-accent/40",
								!still && "animate-splash opacity-0",
							)}
						/>
					</span>
				);
			})}
		</div>
	);
}
