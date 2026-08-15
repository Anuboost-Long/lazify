import type { ContextEntry } from "@main/prompts/types";

export interface ContextPack {
  name: string;
  entries: ContextEntry[];
  /** Drives the pack's own switch, which is only "on" when every entry is. */
  allActive: boolean;
}

/** Packs in first-seen order, with ungrouped entries collected at the end. */
export function groupByPack(entries: ContextEntry[]): ContextPack[] {
  const packs = new Map<string, ContextEntry[]>();

  for (const entry of entries) {
    const existing = packs.get(entry.pack);
    if (existing) existing.push(entry);
    else packs.set(entry.pack, [entry]);
  }

  const named = [...packs.entries()].filter(([name]) => name !== "");
  const loose = packs.get("");

  return [...named, ...(loose ? ([["", loose]] as const) : [])].map(([name, packEntries]) => ({
    name,
    entries: packEntries,
    allActive: packEntries.every((entry) => entry.isActive)
  }));
}
