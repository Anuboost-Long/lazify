/**
 * The measurements the surface and its three columns all have to agree on.
 * Kept in one place because the gutter, the read-only code and the editable
 * underlay are separate elements that must line up to the pixel.
 */
export const STYLES = {
	panel: {
		frame: "rounded-[20px] border border-accent/15 bg-bg/60",
		gutter: "w-14 px-3 py-4 text-xs leading-[25px]",
		code: "px-5 py-4 text-sm leading-[25px]",
	},
	flush: {
		frame: "",
		// Gutter and code share one leading to the pixel: they are two separately
		// scrolled columns, so any difference walks the line numbers off the code.
		gutter: "w-12 px-2 py-2 text-[11px] leading-[25px]",
		code: "px-3 py-2 text-[12px] leading-[25px]",
	},
} as const;

export type SurfaceVariant = keyof typeof STYLES;

export const GUTTER_BASE =
	"shrink-0 overflow-hidden border-r border-border bg-bg/60 text-right font-mono text-muted/80";

// The code column takes the row's leftover width (flex-1 + min-w-0) but its
// scroller is absolutely positioned inside it: out-of-flow content reports zero
// intrinsic width, so a long line can never stretch this column — or any
// ancestor that forgot its own min-w-0 — and instead scrolls within.
export const CODE_WRAP = "relative h-full min-w-0 flex-1";
export const CODE_BASE = "absolute inset-0 font-mono";

/** Whether long lines fold or scroll sideways, as the two columns spell it. */
export const wrapping = (wrap: boolean) =>
	wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre";

export const scrolling = (wrap: boolean) =>
	wrap ? "overflow-y-auto overflow-x-hidden" : "overflow-auto";

/** The colours a code theme brings with it, when one is loaded. */
export interface ThemedCode {
	background: string;
	color: string;
}
