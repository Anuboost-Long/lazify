export type DocSelection =
  | { kind: "document" }
  | { kind: "folder"; id: string }
  | { kind: "request"; id: string };

export const DOCUMENT_SELECTION: DocSelection = { kind: "document" };

export function sameSelection(left: DocSelection, right: DocSelection): boolean {
  if (left.kind !== right.kind) return false;

  return left.kind === "document" || right.kind === "document" || left.id === right.id;
}
