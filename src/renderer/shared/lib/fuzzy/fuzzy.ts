/**
 * Fuzzy subsequence matcher with scoring — the engine behind quick-open.
 *
 * Deliberately free of React and of any file concepts, so it can rank anything
 * a query is typed against: files today, a command palette tomorrow. The score
 * rewards matches at word boundaries and camelCase humps and runs of
 * consecutive characters, so "uat" ranks `use-agent-terminals` above an
 * incidental u…a…t buried elsewhere.
 *
 * How it matches, cheapest path first:
 *   1. A single forward scan gates out non-matches (the common case).
 *   2. Survivors are scored by an optimal O(query × target) dynamic program
 *      that considers every alignment and keeps the best — greedy scorers pick
 *      the first alignment, which drifts off word boundaries.
 * Per-target boundary data is precomputed once via `prepareTarget`, and the DP
 * runs on scratch buffers reused across candidates, so a keystroke does no
 * per-file preparation and little allocation.
 */

const SCORE_MATCH = 16;
const BONUS_CONSECUTIVE = 12;
const BONUS_BOUNDARY = 10; // first char, or the char right after a separator
const BONUS_CAMEL = 8; // a lower/digit -> upper "hump"
const PENALTY_LEADING = 1; // per char before the first match, capped
const LEADING_CAP = 10;

const NEG = -Infinity;

const SEPARATORS = new Set(["/", "\\", "_", "-", ".", " "]);

function isUpper(ch: string): boolean {
  return ch >= "A" && ch <= "Z";
}

function isLowerOrDigit(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9");
}

/** Boundary/camel bonus a match at `index` earns, independent of the query. */
function positionBonus(text: string, index: number): number {
  if (index === 0) return BONUS_BOUNDARY;

  const prev = text[index - 1];
  if (SEPARATORS.has(prev)) return BONUS_BOUNDARY;
  if (isLowerOrDigit(prev) && isUpper(text[index])) return BONUS_CAMEL;

  return 0;
}

export interface PreparedTarget {
  readonly text: string;
  readonly lower: string;
  /** Precomputed `positionBonus` for every index of `text`. */
  readonly bonus: readonly number[];
}

/** Builds the reusable per-target data. Call once per candidate, not per query. */
export function prepareTarget(text: string): PreparedTarget {
  const bonus = new Array<number>(text.length);
  for (let i = 0; i < text.length; i += 1) bonus[i] = positionBonus(text, i);

  return { text, lower: text.toLowerCase(), bonus };
}

export interface FuzzyMatch {
  score: number;
  /** Indices in `target.text` that matched, ascending — for highlighting. */
  positions: number[];
}

// Scratch reused across calls to avoid per-candidate allocation. Search is
// synchronous and single-threaded, so sharing these is safe; they only grow.
let rowPrev = new Float64Array(0);
let rowCur = new Float64Array(0);
let parent = new Int32Array(0); // for cell (i, j): the target index q[i-1] matched

function ensureScratch(rows: number, cols: number): void {
  if (rowCur.length < cols) {
    rowPrev = new Float64Array(cols);
    rowCur = new Float64Array(cols);
  }
  if (parent.length < rows * cols) parent = new Int32Array(rows * cols);
}

/**
 * Scores an already-lowercased `query` against a prepared target. Returns null
 * when the query is not a subsequence of the target — the cheap, common path.
 */
export function fuzzyMatch(query: string, target: PreparedTarget): FuzzyMatch | null {
  const lower = target.lower;
  const bonus = target.bonus;
  const m = query.length;
  const n = lower.length;

  if (m === 0) return { score: 0, positions: [] };
  if (m > n) return null;

  // Gate: a single forward scan rejects anything that is not a subsequence.
  let gate = 0;
  for (let ti = 0; ti < n && gate < m; ti += 1) {
    if (lower[ti] === query[gate]) gate += 1;
  }
  if (gate < m) return null;

  ensureScratch(m, n);
  let prev = rowPrev;
  let cur = rowCur;

  // Row 0: q[0] may land on any matching column, on its own.
  for (let j = 0; j < n; j += 1) {
    if (lower[j] === query[0]) {
      prev[j] = SCORE_MATCH + bonus[j];
      parent[j] = -1;
    } else {
      prev[j] = NEG;
    }
  }

  // Rows 1..m-1: q[i] extends a match of q[0..i-1] that ended before j.
  for (let i = 1; i < m; i += 1) {
    const rowBase = i * n;
    const qi = query[i];
    // Best reachable score, and where it ended, among columns already passed.
    let bestBefore = NEG;
    let bestBeforeCol = -1;

    for (let j = 0; j < n; j += 1) {
      if (lower[j] === qi) {
        const step = SCORE_MATCH + bonus[j];
        let value = NEG;
        let via = -1;

        // Non-consecutive: continue from the best match ending at some k < j.
        if (bestBefore > NEG) {
          value = bestBefore + step;
          via = bestBeforeCol;
        }
        // Consecutive: continue right after a match at j - 1, with the bonus.
        if (j > 0 && prev[j - 1] > NEG) {
          const consecutive = prev[j - 1] + step + BONUS_CONSECUTIVE;
          if (consecutive > value) {
            value = consecutive;
            via = j - 1;
          }
        }

        cur[j] = value;
        parent[rowBase + j] = via;
      } else {
        cur[j] = NEG;
      }

      // Fold column j of the previous row into the running best for k < j+1.
      if (prev[j] > bestBefore) {
        bestBefore = prev[j];
        bestBeforeCol = j;
      }
    }

    const swap = prev;
    prev = cur;
    cur = swap;
  }

  // Best end column of the final row.
  let bestScore = NEG;
  let bestCol = -1;
  for (let j = 0; j < n; j += 1) {
    if (prev[j] > bestScore) {
      bestScore = prev[j];
      bestCol = j;
    }
  }
  if (bestCol === -1) return null;

  // Walk the parent pointers back to recover the matched columns.
  const positions = new Array<number>(m);
  let col = bestCol;
  for (let i = m - 1; i >= 0; i -= 1) {
    positions[i] = col;
    col = parent[i * n + col];
  }

  const score = bestScore - Math.min(positions[0], LEADING_CAP) * PENALTY_LEADING;
  return { score, positions };
}
