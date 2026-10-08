import type { ReadingShape } from "@/shared/terminal/terminal-pool";

import type { MonitorPanel, MonitorPanelSize } from "./use-monitor-panels";

/**
 * Tidying up is about what is worth reading, not what is worth watching.
 *
 * How much a run has printed says nothing about whether it needs the space —
 * an installer scrolls for minutes and can be read in a thumbnail, while a diff
 * or a stack trace is unreadable in a narrow column the moment it appears. So
 * the size a panel is given comes from how its visible output is laid out, and
 * a panel with nothing demanding on screen keeps the small size it had, still
 * running, whatever its position in the order.
 */

/** Columns of text, wrapping lines: this one is being read, not watched. */
const DEEP = 0.55;

/** Enough structure to be awkward in one column, not enough to take two rows. */
const INVOLVED = 0.25;

const MAX_ENLARGED_PANELS = 3;

export interface TidyPlan {
  order: string[];
  sizes: Record<string, MonitorPanelSize>;
}

export interface TidyInput {
  panels: MonitorPanel[];
  waitingRunIds: string[];
  /** How much has scrolled out of sight — used to rank, never to size. */
  overflowScreens: (runId: string) => number;
  /** Which way the visible output needs room: rows for prose, columns for structure. */
  readingShape: (runId: string) => ReadingShape;
  /** How much of what ran was plumbing, from 0 to 1. */
  routineWork: (runId: string) => number;
  /**
   * Columns the wall actually has right now, which is a fact about the window
   * rather than a setting — the same layout is three columns on a desktop and
   * one on a laptop in a split.
   */
  columns: number;
}

/** Most of what ran was plumbing — pushing, installing, moving files about. */
const ROUTINE = 0.6;

const SPAN: Record<MonitorPanelSize, { width: number; height: number }> = {
  default: { width: 1, height: 1 },
  wide: { width: 2, height: 1 },
  tall: { width: 1, height: 2 },
  large: { width: 2, height: 2 }
};

/** What a panel settles for when the grid has no room for what it earned. */
const FALLBACK: Record<MonitorPanelSize, MonitorPanelSize[]> = {
  default: ["default"],
  wide: ["wide", "default"],
  tall: ["tall", "default"],
  large: ["large", "tall", "default"]
};

/**
 * Hands out sizes that actually tile, filling the wall left to right.
 *
 * The grid places each panel at the first free cell after the previous one, and
 * a panel that does not fit there is pushed on, leaving the cells it skipped
 * empty. So the grid is walked cell by cell as it will be drawn, and a size is
 * only granted when it fits at that free cell. A panel two rows high also has
 * to leave a neighbour in the row below that someone can fill: if too few
 * panels are left to close the gaps beside it, it keeps to one row.
 *
 * With one column nothing can span, which is also what the panel's own
 * breakpoints do — the size is carried but not drawn.
 */
function openGrid(columns: number) {
  const taken = new Set<string>();
  const cell = (row: number, column: number) => `${row}:${column}`;
  let row = 0;
  let column = 0;

  const skipTaken = () => {
    while (taken.has(cell(row, column))) {
      column += 1;
      if (column >= columns) {
        column = 0;
        row += 1;
      }
    }
  };

  const fits = ({ width, height }: { width: number; height: number }) => {
    if (column + width > columns) return false;

    for (let down = 0; down < height; down += 1) {
      for (let across = 0; across < width; across += 1) {
        if (taken.has(cell(row + down, column + across))) return false;
      }
    }

    return true;
  };

  /** Cells left open around a two-row panel, in its first row and the one under it. */
  const gapsBeside = ({ width }: { width: number }) => {
    let gaps = 0;

    for (let across = column + width; across < columns; across += 1) {
      if (!taken.has(cell(row, across))) gaps += 1;
    }
    for (let across = 0; across < columns; across += 1) {
      const underSpan = across >= column && across < column + width;
      if (!underSpan && !taken.has(cell(row + 1, across))) gaps += 1;
    }

    return gaps;
  };

  return {
    place(size: MonitorPanelSize, remaining: number): MonitorPanelSize {
      skipTaken();

      const granted =
        columns < 2
          ? "default"
          : (FALLBACK[size].find((candidate) => {
              const span = SPAN[candidate];
              if (!fits(span)) return false;
              return span.height === 1 || gapsBeside(span) <= remaining;
            }) ?? "default");

      const span = SPAN[granted];
      for (let down = 0; down < span.height; down += 1) {
        for (let across = 0; across < span.width; across += 1) {
          taken.add(cell(row + down, column + across));
        }
      }

      return granted;
    }
  };
}

function attentionRank(runId: string, waiting: Set<string>) {
  return waiting.has(runId) ? 0 : 1;
}

function kindRank(panel: MonitorPanel) {
  if (panel.exited) return 2;

  return panel.kind === "agent" ? 0 : 1;
}

export function planTidyUp({
  panels,
  waitingRunIds,
  overflowScreens,
  readingShape,
  routineWork,
  columns
}: TidyInput): TidyPlan {
  const waiting = new Set(waitingRunIds);

  // Either reason alone earns the space; a panel with both is not twice as bad.
  const readingDemand = (runId: string) => {
    const { wrapped, structured } = readingShape(runId);
    return Math.max(wrapped, structured);
  };

  /**
   * Errands sink below real work. Only when there is nothing to read on them,
   * though — a push that was rejected, or an install that failed, is an errand
   * that has become the most interesting thing on the wall.
   */
  const errandRank = (runId: string) =>
    routineWork(runId) >= ROUTINE && readingDemand(runId) < INVOLVED ? 1 : 0;

  const ranked = [...panels].sort((left, right) => {
    const byAttention = attentionRank(left.runId, waiting) - attentionRank(right.runId, waiting);
    if (byAttention !== 0) return byAttention;

    const byKind = kindRank(left) - kindRank(right);
    if (byKind !== 0) return byKind;

    const byErrand = errandRank(left.runId) - errandRank(right.runId);
    if (byErrand !== 0) return byErrand;

    return overflowScreens(right.runId) - overflowScreens(left.runId);
  });

  const sizes: Record<string, MonitorPanelSize> = {};
  let enlarged = 0;

  /** What the panel has earned, before the grid gets a say. */
  const wanted = (panel: MonitorPanel, index: number): MonitorPanelSize => {
    if (panel.exited) return "default";

    const { wrapped, structured } = readingShape(panel.runId);

    if (Math.max(wrapped, structured) < INVOLVED || enlarged >= MAX_ENLARGED_PANELS)
      return "default";

    // Prose reads fine narrow, it just runs long — so it goes tall. Only text
    // laid out in columns needs the width, and it goes wide.
    if (structured < INVOLVED) return "tall";
    if (wrapped < INVOLVED) return "wide";

    // Both at once earns both only for the one panel being read, and only on
    // a wall of three columns or more; on two, large is the whole wall and
    // tall beside a stack of defaults reads better.
    return index === 0 && columns >= 3 && Math.min(wrapped, structured) >= DEEP ? "large" : "tall";
  };

  const grid = openGrid(columns);

  ranked.forEach((panel, index) => {
    const size = grid.place(wanted(panel, index), ranked.length - index - 1);

    sizes[panel.runId] = size;
    if (size !== "default") enlarged += 1;
  });

  return { order: ranked.map((panel) => panel.runId), sizes };
}
