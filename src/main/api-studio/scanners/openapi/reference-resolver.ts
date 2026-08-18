import { asRecord, asText } from "./values";

const MAX_REFERENCE_DEPTH = 12;

function unescapePointerSegment(segment: string) {
  return decodeURIComponent(segment).replace(/~1/g, "/").replace(/~0/g, "~");
}

function followPointer(document: Record<string, unknown>, pointer: string): unknown {
  return pointer
    .split("/")
    .slice(1)
    .map(unescapePointerSegment)
    .reduce<unknown>((node, segment) => {
      if (Array.isArray(node)) return node[Number(segment)];
      return asRecord(node)?.[segment];
    }, document);
}

export function resolveReference(
  document: Record<string, unknown>,
  node: unknown,
  depth = 0
): unknown {
  const record = asRecord(node);
  const reference = record ? asText(record.$ref) : null;

  if (!record || !reference) return node;
  if (depth >= MAX_REFERENCE_DEPTH || !reference.startsWith("#/")) return null;

  return resolveReference(document, followPointer(document, reference), depth + 1);
}

export function resolveRecord(
  document: Record<string, unknown>,
  node: unknown
): Record<string, unknown> | null {
  return asRecord(resolveReference(document, node));
}

export function isExternalReference(node: unknown): boolean {
  const reference = asText(asRecord(node)?.$ref);

  return reference !== null && !reference.startsWith("#/");
}
