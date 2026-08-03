import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { registerFindTarget } from "./find-registry";
import { findRanges, matchOffsets } from "./text-ranges";

/** Painting stops here: past it the highlights cost more than they help. */
const MAX_MATCHES = 2000;
/** Registry names, styled in styles.css. */
const MATCH_HIGHLIGHT = "code-find";
const ACTIVE_HIGHLIGHT = "code-find-active";

/**
 * The registry is one global map, so a surface only clears the highlights while
 * it is still the one that painted them — otherwise closing a modal's find bar
 * would wipe the pane's matches underneath it.
 */
let painter: symbol | null = null;

const supported = typeof CSS !== "undefined" && "highlights" in CSS;

function paint(owner: symbol, ranges: Range[], active: number) {
  if (!supported) return;

  painter = owner;
  CSS.highlights.set(MATCH_HIGHLIGHT, new Highlight(...ranges.filter((_, index) => index !== active)));
  CSS.highlights.set(
    ACTIVE_HIGHLIGHT,
    new Highlight(...(ranges[active] ? [ranges[active]] : []))
  );
}

function unpaint(owner: symbol) {
  if (!supported || painter !== owner) return;

  painter = null;
  CSS.highlights.delete(MATCH_HIGHLIGHT);
  CSS.highlights.delete(ACTIVE_HIGHLIGHT);
}

export interface CodeFind {
  open: boolean;
  query: string;
  /** How many matches the query has, capped at what is painted. */
  count: number;
  /** 0-based position of the match being shown. */
  index: number;
  /** Bumped every time the shortcut is pressed, so the bar retakes focus. */
  openedAt: number;
  setQuery: (value: string) => void;
  next: () => void;
  previous: () => void;
  close: () => void;
}

interface CodeFindOptions {
  /** The panel the shortcut belongs to, and what the bar is drawn over. */
  root: RefObject<HTMLElement | null>;
  /** The scroller holding the text; searched, and scrolled to reveal a match. */
  scroller: RefObject<HTMLElement | null>;
  /**
   * Anything that changes whenever the painted text does — a new file, a theme
   * that re-tokenized it, a fold that opened. Ranges point at nodes, so they go
   * stale the moment those are replaced.
   */
  revision?: unknown;
  /**
   * Editable surfaces search the textarea's own value: the Highlight API has no
   * reach inside a form control, so matches are revealed by selecting them.
   */
  textarea?: RefObject<HTMLTextAreaElement | null>;
}

/** Keeps a match off the very edge of the pane when it is scrolled into view. */
const REVEAL_PADDING = 24;

/**
 * Cmd/Ctrl+F for a code surface: an incremental search over what is on screen,
 * with the matches painted in place and stepped through by Enter.
 */
export function useCodeFind({
  root,
  scroller,
  revision,
  textarea
}: Readonly<CodeFindOptions>): CodeFind {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0);
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);
  const ranges = useRef<Range[]>([]);
  const offsets = useRef<number[]>([]);
  const owner = useRef(Symbol("code-find"));

  useEffect(
    () =>
      registerFindTarget({
        element: () => root.current,
        open: () => {
          setOpen(true);
          setOpenedAt((count) => count + 1);
        }
      }),
    [root]
  );

  // Re-run for every keystroke and every repaint of the code underneath.
  useEffect(() => {
    const editable = textarea?.current;

    if (!open || query.length === 0) {
      ranges.current = [];
      offsets.current = [];
      unpaint(owner.current);
      setCount(0);
      setIndex(0);
      return;
    }

    if (editable) {
      offsets.current = matchOffsets(editable.value, query, MAX_MATCHES);
      setCount(offsets.current.length);
      setIndex(0);
      return;
    }

    const host = scroller.current;
    if (!host) return;

    ranges.current = findRanges(host, query, MAX_MATCHES);
    setCount(ranges.current.length);
    setIndex(0);
  }, [open, query, revision, scroller, textarea]);

  // Painting and revealing follow the active match, whether it moved because the
  // query changed or because Enter stepped to the next one.
  useEffect(() => {
    if (!open || count === 0) return;

    const editable = textarea?.current;

    if (editable) {
      const start = offsets.current[index];
      if (start === undefined) return;

      // Focus is what makes a textarea scroll to its selection, so it is borrowed
      // and handed straight back — the reader is still typing in the find bar.
      const focused = document.activeElement;

      editable.focus();
      editable.setSelectionRange(start, start + query.length);

      if (focused instanceof HTMLElement && focused !== editable) focused.focus();
      return;
    }

    paint(owner.current, ranges.current, index);

    const host = scroller.current;
    const range = ranges.current[index];
    if (!host || !range) return;

    const frame = host.getBoundingClientRect();
    const box = range.getBoundingClientRect();

    // A match already in view is left where it is; scrolling on every keystroke
    // would drag the file around under the reader.
    if (box.top < frame.top + REVEAL_PADDING || box.bottom > frame.bottom - REVEAL_PADDING) {
      host.scrollTop += box.top - frame.top - host.clientHeight / 2;
    }

    if (box.left < frame.left || box.right > frame.right) {
      host.scrollLeft += box.left - frame.left - host.clientWidth / 2;
    }
    // `revision` is a dependency because a repaint replaces the very nodes the
    // ranges point at, even when the query and the match count are unchanged.
  }, [count, index, open, query, revision, scroller, textarea]);

  // Leaving the panel takes its highlights with it.
  useEffect(() => {
    const token = owner.current;

    return () => unpaint(token);
  }, []);

  const step = useCallback(
    (by: number) => setIndex((current) => (count === 0 ? 0 : (current + by + count) % count)),
    [count]
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    ranges.current = [];
    offsets.current = [];
    unpaint(owner.current);
  }, []);

  return {
    open,
    query,
    count,
    index,
    openedAt,
    setQuery,
    next: () => step(1),
    previous: () => step(-1),
    close
  };
}
