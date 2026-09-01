import clsx from "clsx";
import type {
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent,
	MutableRefObject,
	ReactNode,
} from "react";

import { CODE_BASE, scrolling, wrapping, type ThemedCode } from "./styles";

interface EditableCodeProps {
	content: string;
	lines: ReactNode;
	/** The highlighted underlay, which is also what findings are painted on. */
	highlightRef: MutableRefObject<HTMLPreElement | null>;
	textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
	/** The caller's own handle on the caret and selection. */
	inputRef?: MutableRefObject<HTMLTextAreaElement | null>;
	className: string;
	themed?: ThemedCode;
	wrap: boolean;
	label?: string;
	placeholder?: string;
	onContentChange?: (value: string) => void;
	onScrollTop: (scrollTop: number) => void;
	onKeyDown?: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
	onContextMenu: (event: MouseEvent<HTMLTextAreaElement>) => void;
	onMouseMove: (event: MouseEvent<HTMLTextAreaElement>) => void;
	onMouseLeave: () => void;
}

/**
 * Code being edited: the same highlighted document as a non-interactive
 * underlay, with a transparent textarea above it carrying the caret, the
 * selection, and every native editing behaviour that comes free with one.
 *
 * The two layers are kept in step by hand — the textarea is the only one that
 * scrolls, and it drags the underlay along.
 */
export function EditableCode({
	content,
	lines,
	highlightRef,
	textareaRef,
	inputRef,
	className,
	themed,
	wrap,
	label,
	placeholder,
	onContentChange,
	onScrollTop,
	onKeyDown,
	onContextMenu,
	onMouseMove,
	onMouseLeave,
}: Readonly<EditableCodeProps>) {
	return (
		<>
			<pre
				ref={highlightRef}
				aria-hidden="true"
				data-editable-highlight=""
				className={clsx(CODE_BASE, className, "pointer-events-none overflow-hidden", wrapping(wrap))}
				style={themed}
			>
				{lines}
			</pre>
			<textarea
				ref={(node) => {
					textareaRef.current = node;
					if (inputRef) inputRef.current = node;
				}}
				value={content}
				aria-label={label}
				wrap={wrap ? "soft" : "off"}
				onChange={(event) => onContentChange?.(event.target.value)}
				onKeyDown={onKeyDown}
				onContextMenu={onContextMenu}
				// The textarea is what the pointer actually meets while editing; the
				// underlines it asks about are painted on the layer below.
				onMouseMove={onMouseMove}
				onMouseLeave={onMouseLeave}
				onScroll={(event) => {
					const { scrollLeft, scrollTop } = event.currentTarget;

					onScrollTop(scrollTop);

					if (highlightRef.current) {
						highlightRef.current.scrollLeft = scrollLeft;
						highlightRef.current.scrollTop = scrollTop;
					}
				}}
				spellCheck={false}
				className={clsx(
					CODE_BASE,
					className,
					"resize-none bg-transparent text-transparent outline-none placeholder:text-muted",
					scrolling(wrap),
					wrapping(wrap),
				)}
				style={{ caretColor: themed?.color ?? "rgb(var(--color-text))" }}
				placeholder={placeholder}
			/>
		</>
	);
}
