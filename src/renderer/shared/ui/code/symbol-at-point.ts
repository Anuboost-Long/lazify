/**
 * The target under a click, read straight from the rendered text.
 *
 * Go-to-definition needs either a name or a module path, and the highlighted
 * code is a tree of coloured spans — so rather than making every token its own
 * hit target, the caret position tells us where on the line the pointer is. The
 * whole line is then read back out of the DOM and worked on as text, which is
 * what lets a target run across as many spans as the highlighter felt like
 * making: `"@renderer/shared/ui/code"` is one path to the reader, and one
 * target here, however many pieces it was painted in.
 */

import { rangeBetween, scanTextNodes, type TextPiece } from "./find/text-ranges";

/** What an identifier is made of, for walking outwards from the caret. */
const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;

/** Set on every rendered line, which is how far a target may reach. */
const LINE_SELECTOR = "[data-code-line]";

/** The three string delimiters a module specifier can be written with. */
const QUOTES = new Set(["'", '"', "`"]);

/** What a module specifier may be made of, once the quotes are off. */
const MODULE_PATH = /^[\w@~./-]+$/;

/** A whole identifier, which is what the finder in main will accept. */
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/**
 * Words that are never a definition worth jumping to. Keywords would each
 * resolve to nothing anyway; the cost of listing them is one less pointless
 * round trip per stray click.
 */
const NOT_A_SYMBOL = new Set([
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "of",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "yield"
]);

/**
 * Neither caret API is in the DOM lib the app compiles against in a shape we
 * can rely on — `caretRangeFromPoint` is Chromium's own, and the standard
 * `caretPositionFromPoint` is not in every runtime — so both are read off the
 * document as optionals rather than assumed.
 */
type CaretDocument = {
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
  caretPositionFromPoint?: (
    x: number,
    y: number
  ) => { offsetNode: Node; offset: number } | null;
};

function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as unknown as CaretDocument;

  const range = doc.caretRangeFromPoint?.(x, y);
  if (range) return { node: range.startContainer, offset: range.startOffset };

  const position = doc.caretPositionFromPoint?.(x, y);
  if (position) return { node: position.offsetNode, offset: position.offset };

  return null;
}

/** Where in the file the target sits, which is what gives it its meaning. */
export interface SymbolPosition {
  /** 1-based, matching the gutter. */
  line: number;
  /** 0-based offset into the line's text. */
  column: number;
}

export interface SymbolHit {
  symbol: string;
  /**
   * The characters the target occupies, so the link cue can be drawn over
   * exactly what the pointer is on rather than the coloured span it sits in.
   */
  range: Range;
  /**
   * Absent when the surface does not mark its lines. With it, a name can be
   * read in context — a JSX prop belongs to the component it is written on, not
   * to whatever else in the project happens to share its spelling.
   */
  position?: SymbolPosition;
}

/** The whole line under a node, as text plus the nodes it was painted from. */
function lineAround(node: Text): { text: string; pieces: TextPiece[]; line: Element | null } {
  const line = node.parentElement?.closest(LINE_SELECTOR) ?? null;

  if (line) return { ...scanTextNodes(line), line };

  // Nothing marked the line — a surface that does not render them. The node on
  // its own is still enough for a single-span word.
  return { text: node.textContent ?? "", pieces: [{ node, start: 0 }], line: null };
}

/** Which line of the file this is: lines are rendered in order, one per row. */
function lineNumberOf(line: Element | null): number | null {
  const siblings = line?.parentElement?.children;
  if (!line || !siblings) return null;

  const index = Array.prototype.indexOf.call(siblings, line);

  return index < 0 ? null : index + 1;
}

/** Where the caret sits in the line's text, or null if its node is not in it. */
function offsetInLine(pieces: TextPiece[], node: Text, offset: number): number | null {
  const piece = pieces.find((candidate) => candidate.node === node);
  if (!piece) return null;

  return piece.start + Math.min(offset, node.textContent?.length ?? 0);
}

/**
 * The quoted run `at` falls inside, without its quotes. Import paths are the
 * reason this exists: to the reader `"@renderer/shared/ui"` is one thing, and
 * splitting it at every slash is what made only part of it reachable.
 */
function quotedAround(text: string, at: number): { start: number; end: number } | null {
  let open = -1;
  let quote = "";

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (!QUOTES.has(char)) continue;

    if (open === -1) {
      open = index;
      quote = char;
      continue;
    }

    if (char !== quote) continue;
    if (at >= open + 1 && at <= index) return { start: open + 1, end: index };

    open = -1;
    quote = "";
  }

  return null;
}

/** Strings worth following: a path, not prose that happens to be quoted. */
function isModulePath(value: string): boolean {
  return value.length > 1 && MODULE_PATH.test(value) && (value.includes("/") || value.startsWith("."));
}

/**
 * The target at viewport coordinates and where it is, or null when there is not
 * one there — a keyword, an ordinary string, punctuation, or empty space past
 * the end of a line.
 */
export function symbolHitAtPoint(x: number, y: number): SymbolHit | null {
  const caret = caretAt(x, y);
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return null;

  const node = caret.node as Text;
  const { text, pieces, line } = lineAround(node);
  const at = offsetInLine(pieces, node, caret.offset);
  if (at === null) return null;

  const lineNumber = lineNumberOf(line);
  const positionAt = (column: number): SymbolPosition | undefined =>
    lineNumber === null ? undefined : { line: lineNumber, column };

  // A module specifier is taken whole, quotes off: it is one destination, so
  // hovering anywhere in it lights all of it. Any other quoted text falls
  // through to the word under the pointer, which is what it did before.
  const quoted = quotedAround(text, at);
  if (quoted) {
    const specifier = text.slice(quoted.start, quoted.end);

    if (isModulePath(specifier)) {
      return {
        symbol: specifier,
        range: rangeBetween(pieces, quoted.start, quoted.end),
        position: positionAt(quoted.start)
      };
    }
  }

  let start = Math.min(at, text.length);
  let end = start;

  // A click lands between two characters, so grow in both directions. Clicking
  // the gap after a word still finds it, which is what the eye expects.
  while (start > 0 && IDENTIFIER_CHAR.test(text[start - 1])) start -= 1;
  while (end < text.length && IDENTIFIER_CHAR.test(text[end])) end += 1;

  const word = text.slice(start, end);

  // One-character names are ambiguous enough to be noise, and a keyword is not
  // a place in the project.
  if (word.length < 2 || !IDENTIFIER.test(word) || NOT_A_SYMBOL.has(word)) return null;

  return { symbol: word, range: rangeBetween(pieces, start, end), position: positionAt(start) };
}

/** The target at viewport coordinates, for callers that only need the text. */
export function symbolAtPoint(x: number, y: number): string | null {
  return symbolHitAtPoint(x, y)?.symbol ?? null;
}
