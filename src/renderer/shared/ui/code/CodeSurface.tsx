import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useHighlightedLines } from "./CodeText";
import { CodeFindBar } from "./find/CodeFindBar";
import { useCodeFind } from "./find/use-code-find";
import { CodeContextMenu } from "./menu/CodeContextMenu";
import {
  readCodeSelection,
  readTextareaSelection,
  type CodeSelectionAction,
  type CodeSelectionContext
} from "./menu/code-selection";
import { useCodeSelectionActions } from "./menu/selection-actions";
import { symbolHitAtPoint, type SymbolPosition } from "./symbol-at-point";
import { useCodePalette } from "./highlighter/use-highlighter";
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
  variant?: "panel" | "flush";
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
  filePath?: string | null;
  selectionActions?: CodeSelectionAction[];
}

const STYLES = {
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

const GUTTER_BASE =
  "shrink-0 overflow-hidden border-r border-border bg-bg/60 text-right font-mono text-muted/80";
// The code column takes the row's leftover width (flex-1 + min-w-0) but its
// scroller is absolutely positioned inside it: out-of-flow content reports zero
// intrinsic width, so a long line can never stretch this column — or any
// ancestor that forgot its own min-w-0 — and instead scrolls within.
const CODE_WRAP = "relative h-full min-w-0 flex-1";
const CODE_BASE = "absolute inset-0 font-mono";

/** Cmd on macOS, Ctrl everywhere else — the split every editor uses for this. */
const IS_MAC = navigator.userAgent.includes("Mac OS X");

const holdsModifier = (event: { metaKey: boolean; ctrlKey: boolean }) =>
  IS_MAC ? event.metaKey : event.ctrlKey;

/** Where a link cue goes, in the code column's own scrolled coordinates. */
interface LinkBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function sameBoxes(a: LinkBox[] | null, b: LinkBox[]): boolean {
  if (!a || a.length !== b.length) return false;

  return a.every(
    (box, index) =>
      box.left === b[index].left &&
      box.top === b[index].top &&
      box.width === b[index].width &&
      box.height === b[index].height
  );
}

/**
 * The gutter-plus-code area both editor panes were carrying their own copy of.
 * Read-only content is syntax highlighted directly. Editable content uses the
 * same highlighted document as a non-interactive underlay, with a transparent
 * textarea above it carrying the caret, selection, and native editing behavior.
 */
export function CodeSurface({
  content,
  editable = false,
  fileName,
  onContentChange,
  placeholder,
  variant = "panel",
  className,
  onOpenSymbol,
  focusLine,
  filePath,
  selectionActions,
}: Readonly<CodeSurfaceProps>) {
  const style = STYLES[variant];
  const rootRef = useRef<HTMLDivElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const codeRef = useRef<HTMLPreElement | null>(null);
  const editableHighlightRef = useRef<HTMLPreElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const language = languageOf(fileName);
  const lines = useHighlightedLines(
    content,
    language,
  );
  const palette = useCodePalette();
  const inheritedActions = useCodeSelectionActions();
  const actions = selectionActions ?? inheritedActions;
  // `lines` stands in for the painted text: it is rebuilt whenever the content
  // or the highlighting behind it changes.
  const find = useCodeFind({
    root: rootRef,
    scroller: codeRef,
    revision: lines,
    textarea: editable ? textareaRef : undefined,
  });

  // A dark code theme inside a light pane (or the reverse) has to bring its own
  // background, the way the VS Code editor does.
  const themed = palette
    ? { background: palette.bg, color: palette.fg }
    : undefined;

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

  /**
   * The word the modifier-held pointer is over. Null whenever the key is up,
   * so ordinary reading and selecting look exactly as they did.
   */
  const [linkBoxes, setLinkBoxes] = useState<LinkBox[] | null>(null);
  /** Last seen pointer, so pressing the key without moving still lights a word. */
  const pointer = useRef<{ x: number; y: number } | null>(null);

  const paintLink = useCallback(
    (x: number, y: number, held: boolean) => {
      const code = codeRef.current;
      if (!onOpenSymbol || !code || !held) {
        setLinkBoxes(null);
        return;
      }

      const hit = symbolHitAtPoint(x, y);
      // The caret API answers for whatever is under the point, which may be a
      // pane stacked over this one.
      if (!hit || !code.contains(hit.range.startContainer)) {
        setLinkBoxes(null);
        return;
      }

      // Client rects are viewport-relative and the cue is drawn inside the
      // scroller, so it is put back into content coordinates — that way it
      // stays on its word while the code scrolls under it.
      const frame = code.getBoundingClientRect();
      const boxes = Array.from(hit.range.getClientRects(), (rect) => ({
        left: rect.left - frame.left + code.scrollLeft,
        top: rect.top - frame.top + code.scrollTop,
        width: rect.width,
        height: rect.height
      }));

      // Held down, the pointer moves across the same word many times over. Only
      // a cue that actually moved is worth a render of the whole listing.
      const next = boxes.length ? boxes : null;
      setLinkBoxes((current) => (next && sameBoxes(current, next) ? current : next));
    },
    [onOpenSymbol]
  );

  // The key is watched on the window rather than the surface: it is pressed and
  // released while the pointer rests on a word, and a blur — cmd-tab away, for
  // one — never sends the keyup that would otherwise leave a word lit.
  useEffect(() => {
    if (!onOpenSymbol) return;

    const onKey = (event: KeyboardEvent) => {
      const at = pointer.current;
      if (!at) return;
      paintLink(at.x, at.y, holdsModifier(event));
    };
    const clear = () => setLinkBoxes(null);

    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener("keyup", onKey);
    globalThis.addEventListener("blur", clear);

    return () => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener("keyup", onKey);
      globalThis.removeEventListener("blur", clear);
    };
  }, [onOpenSymbol, paintLink]);

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
    [lines, focusLine]
  );

  const [menu, setMenu] = useState<{
    at: { x: number; y: number };
    selection: CodeSelectionContext;
  } | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleContextMenu = (
    event: React.MouseEvent<HTMLPreElement | HTMLTextAreaElement>
  ) => {
    if (actions.length === 0) return;

    const selection = editable
      ? readTextareaSelection(textareaRef.current)
      : codeRef.current && readCodeSelection(codeRef.current);

    if (!selection) return;

    event.preventDefault();
    setMenu({
      at: { x: event.clientX, y: event.clientY },
      selection: { ...selection, filePath: filePath ?? null, fileName: fileName ?? null }
    });
  };

  const handleCodeMove = (event: React.MouseEvent<HTMLPreElement>) => {
    pointer.current = { x: event.clientX, y: event.clientY };
    paintLink(event.clientX, event.clientY, holdsModifier(event));
  };

  const handleCodeLeave = () => {
    pointer.current = null;
    setLinkBoxes(null);
  };

  const handleCodeClick = (event: React.MouseEvent<HTMLPreElement>) => {
    if (!onOpenSymbol) return;

    // Held, the way an editor asks: a bare click still belongs to reading and
    // selecting, and only the modifier turns a name into a link.
    if (!holdsModifier(event)) return;

    // A drag that selected text was after the text, not a jump.
    const selection = globalThis.getSelection();
    if (selection && !selection.isCollapsed) return;

    const hit = symbolHitAtPoint(event.clientX, event.clientY);
    if (!hit) return;

    // The cue belongs to the word that was here; the jump replaces what is
    // under the pointer, so it goes with it.
    setLinkBoxes(null);
    onOpenSymbol(hit.symbol, hit.position);
  };

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
      <div
        ref={gutterRef}
        className={clsx(GUTTER_BASE, style.gutter)}
        style={themed ? { background: themed.background } : undefined}
      >
        {lines.map((_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>

      <div className={CODE_WRAP}>
        {editable ? (
          <>
            <pre
              ref={editableHighlightRef}
              aria-hidden="true"
              data-editable-highlight=""
              className={clsx(
                CODE_BASE,
                style.code,
                "pointer-events-none overflow-hidden whitespace-pre",
              )}
              style={themed}
            >
              {renderedLines}
            </pre>
            <textarea
              ref={textareaRef}
              value={content}
              wrap="off"
              onChange={(event) => onContentChange?.(event.target.value)}
              onContextMenu={handleContextMenu}
              onScroll={(event) => {
                const { scrollLeft, scrollTop } = event.currentTarget;
                syncGutter(scrollTop);
                if (editableHighlightRef.current) {
                  editableHighlightRef.current.scrollLeft = scrollLeft;
                  editableHighlightRef.current.scrollTop = scrollTop;
                }
              }}
              spellCheck={false}
              className={clsx(
                CODE_BASE,
                style.code,
                "resize-none overflow-auto whitespace-pre bg-transparent text-transparent outline-none placeholder:text-muted",
              )}
              style={{ caretColor: themed?.color ?? "rgb(var(--color-text))" }}
              placeholder={placeholder}
            />
          </>
        ) : (
          <pre
            ref={codeRef}
            onScroll={(event) => {
              syncGutter(event.currentTarget.scrollTop);
              // The word under the pointer has moved out from under it.
              setLinkBoxes(null);
            }}
            onClick={handleCodeClick}
            onContextMenu={handleContextMenu}
            onMouseMove={onOpenSymbol ? handleCodeMove : undefined}
            onMouseLeave={onOpenSymbol ? handleCodeLeave : undefined}
            className={clsx(
              CODE_BASE,
              style.code,
              "overflow-auto whitespace-pre bg-transparent",
              linkBoxes && "cursor-pointer",
            )}
            style={themed}
          >
            {renderedLines}

            {/* The link cue: a tint and an underline over the word itself, laid
                on top rather than wrapped around it, so the highlighter's own
                spans and colours are left exactly as they are. Out of flow and
                deaf to the pointer, so it moves no text and swallows no click.
                Rendered after the lines because the jump-to effect reaches the
                lines by index. */}
            {linkBoxes?.map((box, index) => (
              <span
                key={index}
                aria-hidden
                className="pointer-events-none absolute border-b border-accent bg-accent/[0.16]"
                style={box}
              />
            ))}
          </pre>
        )}
      </div>

      <CodeFindBar find={find} />

      <CodeContextMenu
        position={menu?.at ?? null}
        onClose={closeMenu}
        items={actions.map((action) => ({
          id: action.id,
          label: action.label,
          icon: action.icon,
          disabled: action.disabled,
          onSelect: () => {
            if (menu) action.onSelect(menu.selection);
          }
        }))}
      />
    </div>
  );
}
