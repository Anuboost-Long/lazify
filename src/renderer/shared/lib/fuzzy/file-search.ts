import { fuzzyMatch, prepareTarget, type PreparedTarget } from "./fuzzy";

/**
 * The file-search engine behind quick-open.
 *
 * Builds a prepared index of every file once (`setEntries`), then ranks it
 * against a query per keystroke. Matching is delegated to the fuzzy engine;
 * this layer adds only the file-specific bias — a hit in the basename outranks
 * a hit in the directory, which is what makes typing a name feel direct.
 */

export interface FileSearchEntry {
  /** Stable id used to open the file (the tree node id). */
  id: string;
  /** Basename, e.g. "tokenize.ts". */
  name: string;
  /** The path shown and matched against, e.g. "shared/ui/code/tokenize.ts". */
  path: string;
  absolutePath: string;
}

interface IndexedFile {
  entry: FileSearchEntry;
  target: PreparedTarget;
  /** Index in `path` where the basename begins, for the filename boost. */
  nameStart: number;
}

export interface FileSearchResult {
  entry: FileSearchEntry;
  score: number;
  /** Matched indices within `entry.path`, ascending — for highlighting. */
  positions: number[];
}

/** Per matched character that lands in the basename. */
const NAME_CHAR_BONUS = 8;
/** Added when the whole query matches inside the basename, so typing a file's
 *  name jumps straight to it rather than to an incidental path match. */
const NAME_WHOLE_BONUS = 40;

export class FileSearchEngine {
  private files: IndexedFile[] = [];

  /**
   * (Re)builds the index. Every file's scoring data is prepared here, once, so
   * searching never re-lowercases or re-scans boundaries.
   */
  setEntries(entries: FileSearchEntry[]): void {
    this.files = entries.map((entry) => ({
      entry,
      target: prepareTarget(entry.path),
      nameStart: entry.path.length - entry.name.length,
    }));
  }

  get size(): number {
    return this.files.length;
  }

  /**
   * Ranks files against `query`. An empty query returns the first `limit` files
   * in index order. Otherwise every file is gated by one subsequence pass and
   * only matches are scored, then the top `limit` come back — highest score
   * first, shorter paths breaking ties so the shallowest match wins.
   */
  search(query: string, limit = 50): FileSearchResult[] {
    const trimmed = query.trim();
    if (trimmed === "") {
      return this.files
        .slice(0, limit)
        .map(({ entry }) => ({ entry, score: 0, positions: [] }));
    }

    const lowered = trimmed.toLowerCase();
    const results: FileSearchResult[] = [];

    for (const file of this.files) {
      const match = fuzzyMatch(lowered, file.target);
      if (!match) continue;

      let score = match.score;
      let inName = 0;
      for (const position of match.positions) {
        if (position >= file.nameStart) {
          score += NAME_CHAR_BONUS;
          inName += 1;
        }
      }
      if (inName === match.positions.length) score += NAME_WHOLE_BONUS;

      results.push({ entry: file.entry, score, positions: match.positions });
    }

    results.sort(
      (a, b) => b.score - a.score || a.entry.path.length - b.entry.path.length,
    );

    return results.length > limit ? results.slice(0, limit) : results;
  }
}
