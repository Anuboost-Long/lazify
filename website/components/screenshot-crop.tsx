import Image from "next/image";

/** Every showcase screenshot is a full-window capture at this size. */
const shot = { width: 3024, height: 1964 };

interface ScreenshotCropProps {
	src: string;
	alt: string;
	/** The region to show, as fractions of the full screenshot. */
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * One region of a real screenshot, so a section can point at the exact control
 * it talks about instead of repeating the whole window the showcase shows.
 */
export function ScreenshotCrop({ src, alt, x, y, w, h }: Readonly<ScreenshotCropProps>) {
	return (
		<div
			className="relative overflow-hidden rounded-xl border border-white/12 bg-[#101820]"
			style={{ aspectRatio: `${w * shot.width} / ${h * shot.height}` }}
		>
			<Image
				src={src}
				alt={alt}
				width={shot.width}
				height={shot.height}
				sizes="(min-width: 1024px) 60vw, 100vw"
				className="absolute max-w-none"
				style={{ width: `${100 / w}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }}
			/>
		</div>
	);
}
