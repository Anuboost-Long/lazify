// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  loadWallLayout,
  pruneLayout,
  registerSession,
  saveWallLayout,
  type MonitorWallLayout,
} from "../../src/renderer/features/agents/hooks/monitor-session-registry";

function layout(overrides: Partial<MonitorWallLayout> = {}): MonitorWallLayout {
  return { refs: {}, columns: "auto", activeRunId: null, monitorMode: false, ...overrides };
}

describe("Live monitor wall layout", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty, on auto, when nothing has been saved", () => {
    expect(loadWallLayout()).toEqual(layout());
  });

  it("round-trips each panel's size, its order, and the column choice", () => {
    saveWallLayout(
      layout({
        refs: {
          "run-1": { runId: "run-1", size: "large", order: 1 },
          "run-2": { runId: "run-2", size: "wide", order: 0 },
        },
        columns: 3,
        activeRunId: "run-2",
      }),
    );

    const loaded = loadWallLayout();

    expect(loaded.columns).toBe(3);
    expect(loaded.activeRunId).toBe("run-2");
    expect(loaded.refs["run-1"]).toEqual({ runId: "run-1", size: "large", order: 1 });
    expect(loaded.refs["run-2"].order).toBe(0);
  });

  it("round-trips a renamed panel's title", () => {
    saveWallLayout(
      layout({
        refs: {
          "run-1": { runId: "run-1", size: "wide", order: 0, title: "auth refactor" },
        },
      }),
    );

    expect(loadWallLayout().refs["run-1"].title).toBe("auth refactor");
  });

  it("remembers which of the two views the page was left on", () => {
    saveWallLayout(layout({ monitorMode: true }));

    expect(loadWallLayout().monitorMode).toBe(true);
  });

  it("defaults to the workbench for a record saved before the mode existed", () => {
    localStorage.setItem(
      "lazify-monitor-wall",
      JSON.stringify({ refs: {}, columns: "auto", activeRunId: null }),
    );

    expect(loadWallLayout().monitorMode).toBe(false);
  });

  it("keeps the chosen view through a prune", () => {
    const pruned = pruneLayout(
      layout({
        monitorMode: true,
        refs: { "run-dead": { runId: "run-dead", size: "wide", order: 0 } },
      }),
      new Set<string>(),
    );

    expect(pruned.monitorMode).toBe(true);
    expect(pruned.refs).toEqual({});
  });

  it("keeps a title through a prune", () => {
    const pruned = pruneLayout(
      layout({
        refs: {
          "run-1": { runId: "run-1", size: "default", order: 0, title: "flaky test hunt" },
          "run-dead": { runId: "run-dead", size: "wide", order: 1, title: "gone" },
        },
      }),
      new Set(["run-1"]),
    );

    expect(pruned.refs["run-1"].title).toBe("flaky test hunt");
    expect(pruned.refs["run-dead"]).toBeUndefined();
  });

  it("places a newly started session at the end, at the default size", () => {
    saveWallLayout(
      layout({ refs: { "run-1": { runId: "run-1", size: "large", order: 0 } } }),
    );

    const next = registerSession("run-2");

    expect(next.refs["run-2"]).toEqual({ runId: "run-2", size: "default", order: 1 });
    // Whoever started it, it is on the wall from here on.
    expect(loadWallLayout().refs["run-2"].order).toBe(1);
  });

  it("leaves an already-placed session where it is", () => {
    saveWallLayout(
      layout({ refs: { "run-1": { runId: "run-1", size: "wide", order: 4 } } }),
    );

    expect(registerSession("run-1").refs["run-1"]).toEqual({
      runId: "run-1",
      size: "wide",
      order: 4,
    });
  });

  it("prunes placements for runs that are no longer alive", () => {
    const pruned = pruneLayout(
      layout({
        refs: {
          "run-1": { runId: "run-1", size: "wide", order: 0 },
          "run-dead": { runId: "run-dead", size: "large", order: 1 },
        },
        activeRunId: "run-dead",
      }),
      new Set(["run-1"]),
    );

    expect(Object.keys(pruned.refs)).toEqual(["run-1"]);
    // The selection cannot point at a session that has gone.
    expect(pruned.activeRunId).toBeNull();
  });

  it("keeps the selection when its run is still alive", () => {
    const pruned = pruneLayout(
      layout({
        refs: { "run-1": { runId: "run-1", size: "default", order: 0 } },
        activeRunId: "run-1",
      }),
      new Set(["run-1"]),
    );

    expect(pruned.activeRunId).toBe("run-1");
  });

  it("falls back to empty rather than throwing on unreadable storage", () => {
    localStorage.setItem("lazify-monitor-wall", "{ not json");

    expect(loadWallLayout()).toEqual(layout());
  });
});
