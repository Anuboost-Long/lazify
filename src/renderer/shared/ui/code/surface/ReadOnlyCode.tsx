import clsx from "clsx";
import type { MouseEvent, MutableRefObject, ReactNode } from "react";

import { CODE_BASE, scrolling, wrapping, type ThemedCode } from "./styles";
import type { LinkBox } from "./use-symbol-link";

interface ReadOnlyCodeProps {
	scrollRef: MutableRefObject<HTMLPreElement | null>;
	lines: ReactNode;
	className: string;
	themed?: ThemedCode;
	wrap: boolean;
	label?: string;
	/** The word the held modifier is lighting, if any. */
	linkBoxes: LinkBox[] | null;
	onScrollTop: (scrollTop: number) => void;
	onClick: (event: MouseEvent<HTMLPreElement>) => void;
	onContextMenu: (event: MouseEvent<HTMLPreElement>) => void;
	onMouseMove: (event: MouseEvent<HTMLPreElement>) => void;
	onMouseLeave: () => void;
}

/** Code being read: highlighted directly, with nothing over it but cues. */
export function ReadOnlyCode({
	scrollRef,
	lines,
	className,
	themed,
	wrap,
	label,
	linkBoxes,
	onScrollTop,
	onClick,
	onContextMenu,
	onMouseMove,
	onMouseLeave,
}: Readonly<ReadOnlyCodeProps>) {
	return (
		<pre
			ref={scrollRef}
			aria-label={label}
			onScroll={(event) => onScrollTop(event.currentTarget.scrollTop)}
			onClick={onClick}
			onContextMenu={onContextMenu}
			onMouseMove={onMouseMove}
			onMouseLeave={onMouseLeave}
			className={clsx(
				CODE_BASE,
				className,
				"bg-transparent",
				scrolling(wrap),
				wrapping(wrap),
				linkBoxes && "cursor-pointer",
			)}
			style={themed}
		>
			{lines}

			{/* The link cue: a tint and an underline over the word itself, laid on
			    top rather than wrapped around it, so the highlighter's own spans and
			    colours are left exactly as they are. Out of flow and deaf to the
			    pointer, so it moves no text and swallows no click. Rendered after the
			    lines because the jump-to effect reaches the lines by index. */}
			{linkBoxes?.map((box, index) => (
				<span
					key={index}
					aria-hidden
					className="pointer-events-none absolute border-b border-accent bg-accent/[0.16]"
					style={box}
				/>
			))}
		</pre>
	);
}
