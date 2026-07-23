/** One rendered line of a unified diff, with the line numbers git implies. */
export interface DiffRow {
  type: "hunk" | "context" | "add" | "remove";
  text: string;
  oldNumber: number | null;
  newNumber: number | null;
}

/** A side-by-side row: either a hunk separator or an old/new pair. */
export type SplitRow =
  { kind: "hunk"; text: string } | { kind: "pair"; left: DiffRow | null; right: DiffRow | null };

const HUNK_PATTERN = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

/**
 * Turns a unified diff into rows, dropping the file headers — the panel
 * already shows the file name above the diff.
 */
export function parseDiffRows(diff: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldNumber = 0;
  let newNumber = 0;
  let started = false;

  for (const line of diff.split("\n")) {
    const hunk = HUNK_PATTERN.exec(line);

    if (hunk) {
      started = true;
      oldNumber = Number.parseInt(hunk[1], 10);
      newNumber = Number.parseInt(hunk[2], 10);
      rows.push({ type: "hunk", text: line, oldNumber: null, newNumber: null });
      continue;
    }

    // Everything before the first hunk is `diff --git`/`index`/`---`/`+++` noise.
    if (!started) continue;

    if (line.startsWith("\\")) continue;

    if (line.startsWith("+")) {
      rows.push({ type: "add", text: line.slice(1), oldNumber: null, newNumber });
      newNumber += 1;
      continue;
    }

    if (line.startsWith("-")) {
      rows.push({ type: "remove", text: line.slice(1), oldNumber, newNumber: null });
      oldNumber += 1;
      continue;
    }

    rows.push({ type: "context", text: line.slice(1), oldNumber, newNumber });
    oldNumber += 1;
    newNumber += 1;
  }

  // A trailing empty line is an artefact of splitting on "\n".
  if (rows.length > 0) {
    const last = rows[rows.length - 1];
    if (last.type === "context" && last.text === "") rows.pop();
  }

  return rows;
}

/** Zips removals against additions so each change sits on one side-by-side row. */
export function toSplitRows(rows: DiffRow[]): SplitRow[] {
  const split: SplitRow[] = [];
  let removed: DiffRow[] = [];
  let added: DiffRow[] = [];

  const flush = () => {
    for (let index = 0; index < Math.max(removed.length, added.length); index += 1) {
      split.push({ kind: "pair", left: removed[index] ?? null, right: added[index] ?? null });
    }

    removed = [];
    added = [];
  };

  for (const row of rows) {
    if (row.type === "remove") {
      removed.push(row);
      continue;
    }

    if (row.type === "add") {
      added.push(row);
      continue;
    }

    flush();

    split.push(
      row.type === "hunk"
        ? { kind: "hunk", text: row.text }
        : { kind: "pair", left: row, right: row }
    );
  }

  flush();

  return split;
}

/**
 * A stretch of the file as it will be shown: either rows to render, or a run
 * of untouched lines folded away behind a band the reader can open.
 */
export type DiffRegion =
  { kind: "rows"; rows: DiffRow[] } | { kind: "fold"; id: number; rows: DiffRow[] };

/** Untouched lines kept either side of a change, so edits keep their bearings. */
const FOLD_CONTEXT = 3;
/** Folding fewer lines than this costs a click and saves nothing. */
const MIN_HIDDEN = 4;

/**
 * Collapses long runs of unchanged lines. A whole-file diff is the honest way
 * to read a change, but most of a file is usually untouched — folding those
 * runs keeps the structure visible without rendering thousands of rows.
 */
export function foldUnchanged(rows: DiffRow[]): DiffRegion[] {
  const regions: DiffRegion[] = [];
  let pending: DiffRow[] = [];
  let foldId = 0;

  const flushPending = () => {
    if (pending.length > 0) regions.push({ kind: "rows", rows: pending });
    pending = [];
  };

  let index = 0;

  while (index < rows.length) {
    if (rows[index].type !== "context") {
      pending.push(rows[index]);
      index += 1;
      continue;
    }

    // Take the whole run of untouched lines at once.
    let end = index;
    while (end < rows.length && rows[end].type === "context") end += 1;

    const run = rows.slice(index, end);
    // The head and tail of the file have nothing above/below to anchor to.
    const head = index === 0 ? 0 : FOLD_CONTEXT;
    const tail = end === rows.length ? 0 : FOLD_CONTEXT;
    const hidden = run.length - head - tail;

    if (hidden >= MIN_HIDDEN) {
      pending.push(...run.slice(0, head));
      flushPending();
      regions.push({ kind: "fold", id: foldId, rows: run.slice(head, head + hidden) });
      foldId += 1;
      pending.push(...run.slice(head + hidden));
    } else {
      pending.push(...run);
    }

    index = end;
  }

  flushPending();

  return regions;
}
