import clsx from "clsx";
import {
	useEffect,
	useMemo,
	useRef,
	type KeyboardEvent as ReactKeyboardEvent,
	type MutableRefObject,
	type ReactNode,
} from "react";

import type { Diagnostic } from "@main/linting";

import { useHighlightedLines } from "./CodeText";
import { findingReference } from "./diagnostics/diagnostic-snippet";
import { DiagnosticCard } from "./diagnostics/DiagnosticCard";
import { useCodeQualityActions } from "./diagnostics/quality-actions";
import { useCodeDiagnostics } from "./diagnostics/use-code-diagnostics";
import { CodeFindBar } from "./find/CodeFindBar";
import { useCodeFind } from "./find/use-code-find";
import { PLAIN_LANGUAGE } from "./highlighter/languages";
import { useCodePalette } from "./highlighter/use-highlighter";
import type { CodeSelectionAction } from "./menu/code-selection";
import { CodeContextMenu } from "./menu/CodeContextMenu";
import { useCodeMenu } from "./menu/use-code-menu";
import { CodeGutter } from "./surface/CodeGutter";
import { EditableCode } from "./surface/EditableCode";
import { ReadOnlyCode } from "./surface/ReadOnlyCode";
import { CODE_WRAP, STYLES, type SurfaceVariant } from "./surface/styles";
import { useSymbolLink } from "./surface/use-symbol-link";
import type { SymbolPosition } from "./symbol-at-point";
import { languageOf } from "./tokenize";

interface CodeSurfaceProps {
	content: string;
	editable?: boolean;
	/** Drives which syntax rules apply; the file's own name is enough. */
	fileName?: string | null;
	/** Omit to render read-only; editable mode overlays a textarea on highlighted code. */
	onContentChange?: (value: string) => void;
	placeholder?: string;
	/**
	 * "panel" is the framed, roomy surface the editor panes use. "flush" fills a
	 * container that already provides its own frame — a modal body — and packs
	 * the lines tighter for reading.
	 */
	variant?: SurfaceVariant;
	/**
	 * Fold long lines instead of scrolling sideways. Numbering goes with it: a
	 * wrapped line covers several rows, which no fixed-height gutter can follow.
	 */
	wrap?: boolean;
	/** Names the surface, the way any other input or region is named. */
	label?: string;
	className?: string;
	/**
	 * Clicking an identifier asks to go to where it is declared. Read-only
	 * surfaces only — the caller decides what "go" means, because each place
	 * this appears navigates its own way. The position comes along so the name
	 * can be read in its context rather than looked up on spelling alone.
	 */
	onOpenSymbol?: (symbol: string, position?: SymbolPosition) => void;
	/** 1-based line to reveal and mark, e.g. the definition just jumped to. */
	focusLine?: number | null;
	/**
	 * Code quality findings for this file, underlined where they were reported.
	 * The caller owns the analysis: this surface only draws what it is handed.
	 */
	diagnostics?: readonly Diagnostic[];
	filePath?: string | null;
	selectionActions?: CodeSelectionAction[];
	/** Editable mode only: the caret and selection the caller needs to read. */
	inputRef?: MutableRefObject<HTMLTextAreaElement | null>;
	onKeyDown?: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
}

/** Past this, highlighting a document costs more than the colour is worth. */
const MAX_HIGHLIGHTED = 250_000;

/** One array, so a surface with no findings never re-paints on a render. */
const NO_DIAGNOSTICS: readonly Diagnostic[] = [];

/**
 * The gutter-plus-code area both editor panes were carrying their own copy of.
 * This owns the refs the columns are measured against and the reading of the
 * file; everything layered over that text — find, findings, the link cue, the
 * context menu — is its own hook, and each column its own component.
 */
export function CodeSurface({
	content,
	editable = false,
	fileName,
	onContentChange,
	placeholder,
	wrap = false,
	label,
	variant = "panel",
	className,
	onOpenSymbol,
	focusLine,
	diagnostics = NO_DIAGNOSTICS,
	filePath,
	selectionActions,
	inputRef,
	onKeyDown,
}: Readonly<CodeSurfaceProps>) {
	const style = STYLES[variant];
	const rootRef = useRef<HTMLDivElement | null>(null);
	const gutterRef = useRef<HTMLDivElement | null>(null);
	const codeRef = useRef<HTMLPreElement | null>(null);
	const editableHighlightRef = useRef<HTMLPreElement | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const language = content.length > MAX_HIGHLIGHTED ? PLAIN_LANGUAGE : languageOf(fileName);
	const lines = useHighlightedLines(content, language);
	const palette = useCodePalette();

	// `lines` stands in for the painted text: it is rebuilt whenever the content
	// or the highlighting behind it changes.
	const find = useCodeFind({
		root: rootRef,
		scroller: codeRef,
		revision: lines,
		textarea: editable ? textareaRef : undefined,
	});
	// Painted into whichever layer carries the text: the code itself when it is
	// being read, the underlay when a textarea is stacked over it.
	const quality = useCodeDiagnostics({
		root: editable ? editableHighlightRef : codeRef,
		diagnostics,
		revision: lines,
	});
	const link = useSymbolLink({ code: codeRef, onOpenSymbol });
	const qualityActions = useCodeQualityActions();
	const menu = useCodeMenu({
		editable,
		code: codeRef,
		textarea: textareaRef,
		filePath,
		fileName,
		selectionActions,
	});

	// A dark code theme inside a light pane (or the reverse) has to bring its own
	// background, the way the VS Code editor does.
	const themed = palette ? { background: palette.bg, color: palette.fg } : undefined;

	const syncGutter = (scrollTop: number) => {
		if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
	};

	// Lands the requested line in the middle of the pane rather than at its top
	// edge, so the definition arrives with its surroundings. Scrolled by hand
	// instead of scrollIntoView, which would also scroll the page around it —
	// and setting scrollTop still fires the event the gutter follows.
	useEffect(() => {
		const code = codeRef.current;
		if (!focusLine || !code) return;

		const line = code.children[focusLine - 1] as HTMLElement | undefined;
		if (!line) return;

		code.scrollTop = Math.max(0, line.offsetTop - code.clientHeight / 2);
		// `lines` is a dependency because the content arrives after the request:
		// the file is opened, then loaded, and only then is there a line to reach.
	}, [focusLine, lines]);

	// Built while a card is showing rather than on every render: reading the
	// code around a finding means splitting the whole file.
	const cardFinding = useMemo(
		() => (quality.card ? findingReference(content, filePath, quality.card.diagnostic) : null),
		[content, filePath, quality.card],
	);

	// Held together so moving the link cue re-renders one span instead of every
	// line in the file: same elements in, React leaves the listing alone.
	const renderedLines = useMemo(
		() =>
			lines.map((line, index) => (
				<div
					key={index}
					// Find works on the painted text, and this is where one line ends.
					data-code-line=""
					// The line jumped to keeps a tint until the next jump, the way an
					// editor leaves the caret line marked after a search.
					className={focusLine === index + 1 ? "bg-accent/[0.14]" : undefined}
				>
					{line as ReactNode}
				</div>
			)),
		[lines, focusLine],
	);

	return (
		<div
			ref={rootRef}
			className={clsx(
				// Relative so the find bar can float over the code rather than take
				// width from it.
				"relative flex h-full overflow-hidden text-text",
				style.frame,
				className,
			)}
		>
			{wrap ? null : (
				<CodeGutter
					scrollRef={gutterRef}
					lineCount={lines.length}
					markedLines={quality.markedLines}
					className={style.gutter}
					background={themed?.background}
				/>
			)}

			<div className={CODE_WRAP}>
				{editable ? (
					<EditableCode
						content={content}
						lines={renderedLines}
						highlightRef={editableHighlightRef}
						textareaRef={textareaRef}
						inputRef={inputRef}
						className={style.code}
						themed={themed}
						wrap={wrap}
						label={label}
						placeholder={placeholder}
						onContentChange={onContentChange}
						onScrollTop={syncGutter}
						onKeyDown={onKeyDown}
						onContextMenu={menu.onContextMenu}
						onMouseMove={quality.onPointerMove}
						onMouseLeave={quality.onPointerLeave}
					/>
				) : (
					<ReadOnlyCode
						scrollRef={codeRef}
						lines={renderedLines}
						className={style.code}
						themed={themed}
						wrap={wrap}
						label={label}
						linkBoxes={link.boxes}
						onScrollTop={(scrollTop) => {
							syncGutter(scrollTop);
							// The word under the pointer has moved out from under it.
							link.clear();
						}}
						onClick={link.onClick}
						onContextMenu={menu.onContextMenu}
						onMouseMove={(event) => {
							link.onMouseMove(event);
							quality.onPointerMove(event);
						}}
						onMouseLeave={() => {
							link.onMouseLeave();
							quality.onPointerLeave();
						}}
					/>
				)}
			</div>

			<CodeFindBar find={find} />

			<DiagnosticCard
				state={quality.card}
				onPointerEnter={quality.onCardEnter}
				onPointerLeave={quality.onCardLeave}
				onFix={qualityActions && cardFinding ? () => qualityActions.fix([cardFinding]) : undefined}
			/>

			<CodeContextMenu position={menu.position} onClose={menu.close} items={menu.items} />
		</div>
	);
}
