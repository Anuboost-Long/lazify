/**
 * Starting a search where the reader already is.
 *
 * Every editor does two things when the shortcut arrives over a highlighted
 * word: it puts that word in the find bar, and it makes the highlighted
 * occurrence the current match — so "3 of 7" means the one under the cursor,
 * and Enter carries on down the file rather than throwing the reader back to
 * the top. Both halves live here: reading the seed, and picking the match to
 * open on.
 *
 * Two rules keep the seed to things that read as a search term. A selection
 * running across lines is a block being copied rather than a word to look for,
 * and one longer than a term is almost always a minified line grabbed by
 * accident.
 */

const MAX_SEED = 200;

export interface FindSeed {
  /** The word to search for. */
  text: string;
  /**
   * Where it sat, in whichever terms that surface searches in: an offset into
   * a textarea's value, or a range over the painted code.
   */
  at: number | Range;
}

function seedable(text: string) {
  if (text.length === 0 || text.length > MAX_SEED) return "";

  return text.includes("\n") ? "" : text;
}

/**
 * The selection inside a textarea. Read from the control itself because
 * `getSelection()` has no reach inside a form control — the same reason the
 * editable surfaces search the textarea's value rather than the painted code.
 */
export function seedFromTextarea(textarea: HTMLTextAreaElement | null): FindSeed | null {
  if (!textarea) return null;

  const { selectionStart, selectionEnd, value } = textarea;
  if (selectionStart === selectionEnd) return null;

  const text = seedable(value.slice(selectionStart, selectionEnd));

  return text ? { text, at: selectionStart } : null;
}

/**
 * The document selection, but only while it lies inside `root` — a word left
 * highlighted in another panel is not this surface's to search for.
 */
export function seedFromElement(root: HTMLElement | null): FindSeed | null {
  if (!root) return null;

  const selection = globalThis.getSelection?.();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const text = seedable(range.toString());

  return text ? { text, at: range.cloneRange() } : null;
}

/** The first match at or after `from`, wrapping to the top when none is. */
export function matchAtOrAfter(offsets: number[], from: number): number {
  const found = offsets.findIndex((offset) => offset >= from);

  return found === -1 ? 0 : found;
}

/** The same, over painted code, where a position is a point in the tree. */
export function rangeAtOrAfter(ranges: Range[], from: Range): number {
  const found = ranges.findIndex((range) => {
    try {
      return range.compareBoundaryPoints(Range.START_TO_START, from) >= 0;
    } catch {
      // The code repainted under the captured selection, so the nodes it points
      // at are no longer the ones on screen. Nothing to compare against.
      return false;
    }
  });

  return found === -1 ? 0 : found;
}
