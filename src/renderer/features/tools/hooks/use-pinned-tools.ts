import { atom, useAtom } from "jotai";

const PINNED_TOOLS_KEY = "lazify-pinned-tools";

function readPinnedToolIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = JSON.parse(globalThis.localStorage.getItem(PINNED_TOOLS_KEY) ?? "[]");
    return Array.isArray(stored)
      ? Array.from(new Set(stored.filter((id): id is string => typeof id === "string")))
      : [];
  } catch {
    return [];
  }
}

const pinnedToolIdsAtom = atom(readPinnedToolIds());

export function usePinnedTools() {
  const [pinnedToolIds, setPinnedToolIds] = useAtom(pinnedToolIdsAtom);

  const togglePinnedTool = (toolId: string) => {
    setPinnedToolIds((current) => {
      const next = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId];
      globalThis.localStorage.setItem(PINNED_TOOLS_KEY, JSON.stringify(next));
      return next;
    });
  };

  return { pinnedToolIds, togglePinnedTool };
}
