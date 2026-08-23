import { resolveRecord } from "../scanners/openapi/reference-resolver";
import { asArray, asFlag, asRecord, asText } from "../scanners/openapi/values";
import { placeholderFor } from "./placeholders";

const MAX_DEPTH = 8;

type Document = Record<string, unknown>;

function referenceOf(node: unknown): string | null {
  return asText(asRecord(node)?.$ref);
}

function objectValue(
  document: Document,
  schema: Record<string, unknown>,
  depth: number,
  seen: Set<string>
): Record<string, unknown> {
  const properties = asRecord(schema.properties) ?? {};
  const value: Record<string, unknown> = {};

  for (const [name, propertySchema] of Object.entries(properties)) {
    if (asFlag(resolveRecord(document, propertySchema)?.readOnly)) continue;

    value[name] = valueFor(document, propertySchema, depth + 1, seen);
  }

  return value;
}

function composedValue(
  document: Document,
  parts: unknown[],
  schema: Record<string, unknown>,
  depth: number,
  seen: Set<string>
): unknown {
  const merged = parts
    .map((part) => valueFor(document, part, depth + 1, seen))
    .filter((part): part is Record<string, unknown> => asRecord(part) !== null);

  return Object.assign({}, ...merged, objectValue(document, schema, depth, seen));
}

function valueFor(document: Document, node: unknown, depth: number, seen: Set<string>): unknown {
  const reference = referenceOf(node);
  if (reference && seen.has(reference)) return null;
  if (depth > MAX_DEPTH) return null;

  const schema = resolveRecord(document, node);
  if (!schema) return null;

  const nested = reference ? new Set([...seen, reference]) : seen;

  if (schema.default !== undefined) return schema.default;
  if (schema.example !== undefined) return schema.example;

  const choices = asArray(schema.enum);
  if (choices.length > 0) return choices[0];

  const allOf = asArray(schema.allOf);
  if (allOf.length > 0) return composedValue(document, allOf, schema, depth, nested);

  const type = asText(schema.type);

  if (type === "array" || schema.items) {
    const item = valueFor(document, schema.items, depth + 1, nested);
    return item === null ? [] : [item];
  }

  if (type === "object" || schema.properties) return objectValue(document, schema, depth, nested);

  const branch = asArray(schema.oneOf)[0] ?? asArray(schema.anyOf)[0];
  if (branch !== undefined) return valueFor(document, branch, depth + 1, nested);

  return placeholderFor({ type, format: asText(schema.format) });
}

export function templateFromSchema(document: Document, schemaNode: unknown): string | null {
  const value = valueFor(document, schemaNode, 0, new Set());

  return value === null || value === undefined ? null : JSON.stringify(value, null, 2);
}
