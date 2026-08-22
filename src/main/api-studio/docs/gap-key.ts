import type { DocGap } from "./types";

export function gapKey(gap: DocGap): string {
  return `${gap.requestId ?? ""}|${gap.folderId ?? ""}|${gap.sectionId}`;
}
