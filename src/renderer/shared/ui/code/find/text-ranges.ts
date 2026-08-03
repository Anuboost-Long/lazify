/**
 * Turning a typed query into ranges over already-painted code.
 *
 * The highlighter splits a line into one span per token, so a match is looked
 * for in the concatenation of every text node under the surface and then mapped
 * back onto the nodes it actually covers. Nothing in the listing is re-rendered
 * for a search — the ranges are handed to the CSS Custom Highlight API instead.
 */

export interface TextPiece {
  node: Text;
  /** Where this node's text starts inside the concatenated string. */
  start: number;
}

export interface Scan {
  text: string;
  pieces: TextPiece[];
}

/** Marks a rendered line, so no match is allowed to run across its end. */
const LINE_ATTRIBUTE = "[data-code-line]";
/** Marks chrome that is not part of the file: gutters, markers. */
const IGNORE_ATTRIBUTE = "[data-code-ignore]";

/**
 * The text painted under `root`, with the nodes it came from — the one reading
 * both find and go-to-definition work from, since a line is a run of coloured
 * spans and neither feature should have to know that.
 */
export function scanTextNodes(root: Element): Scan {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(IGNORE_ATTRIBUTE)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT
  });

  const pieces: TextPiece[] = [];
  let text = "";
  let line: Element | null = null;
  let started = false;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const owner = node.parentElement?.closest(LINE_ATTRIBUTE) ?? null;

    // A break between lines belongs to no node: it keeps the end of one line and
    // the start of the next from reading as one word.
    if (started && owner !== line) text += "\n";

    line = owner;
    started = true;

    pieces.push({ node: node as Text, start: text.length });
    text += node.nodeValue ?? "";
  }

  return { text, pieces };
}

/** The node and offset a position in the scanned text falls on. */
function locate(pieces: TextPiece[], offset: number) {
  let low = 0;
  let high = pieces.length - 1;
  let found = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;

    if (pieces[mid].start <= offset) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const piece = pieces[found];
  const length = piece.node.nodeValue?.length ?? 0;

  // Clamped because a position can land in a line break, which is text with no
  // node behind it.
  return { node: piece.node, offset: Math.min(Math.max(offset - piece.start, 0), length) };
}

/**
 * A range over the scanned text, however many spans it runs across — a word
 * split by the highlighter, or a whole import path.
 */
export function rangeBetween(pieces: TextPiece[], start: number, end: number): Range {
  const from = locate(pieces, start);
  const to = locate(pieces, end);
  const range = document.createRange();

  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);

  return range;
}

/** Every case-insensitive match of `query` in `text`, as start offsets. */
export function matchOffsets(text: string, query: string, limit: number): number[] {
  if (!query) return [];

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const offsets: number[] = [];

  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) {
    offsets.push(at);
    if (offsets.length >= limit) break;
  }

  return offsets;
}

/** Every match under `root`, as live ranges the highlight registry can paint. */
export function findRanges(root: HTMLElement, query: string, limit: number): Range[] {
  const { text, pieces } = scanTextNodes(root);

  if (pieces.length === 0) return [];

  return matchOffsets(text, query, limit).map((offset) =>
    rangeBetween(pieces, offset, offset + query.length)
  );
}
