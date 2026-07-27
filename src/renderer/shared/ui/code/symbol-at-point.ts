/**
 * The identifier under a click, read straight from the rendered text.
 *
 * Go-to-definition needs a name, and the highlighted code is a tree of coloured
 * spans — so rather than making every token its own hit target, the caret
 * position tells us which text node was clicked and where in it. That keeps the
 * highlighter, the tokenizer and the DOM shape entirely out of it: whatever a
 * line is painted from, the word under the pointer reads the same.
 */

/** What an identifier is made of, for walking outwards from the caret. */
const IDENTIFIER_CHAR = /[A-Za-z0-9_$]/;

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

export interface SymbolHit {
  symbol: string;
  /**
   * The characters the name occupies, so the link cue can be drawn over exactly
   * the word the pointer is on rather than the whole coloured span it sits in.
   */
  range: Range;
}

/**
 * The identifier at viewport coordinates and where it is, or null when there is
 * not one there — a keyword, a string, punctuation, or empty space past the end
 * of a line.
 */
export function symbolHitAtPoint(x: number, y: number): SymbolHit | null {
  const caret = caretAt(x, y);
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return null;

  const text = caret.node.textContent ?? "";
  let start = Math.min(caret.offset, text.length);
  let end = start;

  // A click lands between two characters, so grow in both directions. Clicking
  // the gap after a word still finds it, which is what the eye expects.
  while (start > 0 && IDENTIFIER_CHAR.test(text[start - 1])) start -= 1;
  while (end < text.length && IDENTIFIER_CHAR.test(text[end])) end += 1;

  const word = text.slice(start, end);

  // One-character names are ambiguous enough to be noise, and a keyword is not
  // a place in the project.
  if (word.length < 2 || !IDENTIFIER.test(word) || NOT_A_SYMBOL.has(word)) return null;

  const range = document.createRange();
  range.setStart(caret.node, start);
  range.setEnd(caret.node, end);

  return { symbol: word, range };
}

/** The identifier at viewport coordinates, for callers that only need the name. */
export function symbolAtPoint(x: number, y: number): string | null {
  return symbolHitAtPoint(x, y)?.symbol ?? null;
}
