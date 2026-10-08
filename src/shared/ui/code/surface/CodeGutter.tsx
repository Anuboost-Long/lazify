import clsx from "clsx";
import type { MutableRefObject } from "react";

import { GUTTER_BASE } from "./styles";

interface CodeGutterProps {
	scrollRef: MutableRefObject<HTMLDivElement | null>;
	lineCount: number;
	/** Lines carrying a code quality finding. */
	markedLines: ReadonlySet<number>;
	className: string;
	background?: string;
}

/**
 * The line numbers beside the code, scrolled to follow it.
 *
 * A line carrying a finding is named in the one colour the underline uses,
 * rather than given a marker of its own: this column and the code are scrolled
 * separately, so their leading has to stay identical to the pixel and nothing
 * here may change a row's height.
 */
export function CodeGutter({
	scrollRef,
	lineCount,
	markedLines,
	className,
	background,
}: Readonly<CodeGutterProps>) {
	return (
		<div
			ref={scrollRef}
			className={clsx(GUTTER_BASE, className)}
			style={background ? { background } : undefined}
		>
			{Array.from({ length: lineCount }, (_, index) => (
				<div key={index} className={clsx(markedLines.has(index + 1) && "text-warning")}>
					{index + 1}
				</div>
			))}
		</div>
	);
}
