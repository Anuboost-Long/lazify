import { describe, expect, it } from "vitest";

import type { ContextEntry } from "../../src/main/prompts/types";
import { groupByPack } from "../../src/renderer/features/prompts/lib/group-context";

function entry(overrides: Partial<ContextEntry>): ContextEntry {
  return {
    id: `id-${Math.random()}`,
    scope: "project",
    scopeKey: "/work/demo",
    type: "rule",
    category: "Coding Rules",
    payload: { strength: "required", action: "follow the house style" },
    appliesTo: [],
    pack: "",
    isActive: true,
    sortOrder: 0,
    ...overrides
  };
}

describe("grouping context into packs", () => {
  it("keeps packs in the order they first appear", () => {
    const packs = groupByPack([
      entry({ pack: "House rules" }),
      entry({ pack: "Deployment" }),
      entry({ pack: "House rules" })
    ]);

    expect(packs.map((pack) => pack.name)).toEqual(["House rules", "Deployment"]);
    expect(packs[0].entries).toHaveLength(2);
  });

  it("collects ungrouped entries last, so named packs lead", () => {
    const packs = groupByPack([entry({ pack: "" }), entry({ pack: "House rules" })]);

    expect(packs.map((pack) => pack.name)).toEqual(["House rules", ""]);
  });

  it("only calls a pack on when every entry in it is on", () => {
    const packs = groupByPack([
      entry({ pack: "House rules", isActive: true }),
      entry({ pack: "House rules", isActive: false })
    ]);

    expect(packs[0].allActive).toBe(false);
  });
});
