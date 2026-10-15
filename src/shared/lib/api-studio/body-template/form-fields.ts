/**
 * A form has no nesting: it has field names.
 *
 * The model binder reads `Person.Name` and `Items[0].Id`, so a model bound to a
 * form is flattened to the names it will actually be posted under rather than
 * shown as a document it would never accept.
 */

const MAX_DEPTH = 6;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function flatten(
  value: Record<string, unknown>,
  prefix: string,
  depth: number,
  into: Record<string, unknown>
) {
  for (const [key, nested] of Object.entries(value)) {
    const name = `${prefix}${key}`;

    if (depth >= MAX_DEPTH) {
      into[name] = "";
      continue;
    }

    if (isPlainObject(nested)) {
      flatten(nested, `${name}.`, depth + 1, into);
      continue;
    }

    if (Array.isArray(nested)) {
      const [first] = nested;

      if (isPlainObject(first)) flatten(first, `${name}[0].`, depth + 1, into);
      else into[name] = first ?? "";

      continue;
    }

    into[name] = nested;
  }
}

export function flattenFormFields(body: string | null): string | null {
  if (!body) return body;

  try {
    const parsed = JSON.parse(body) as unknown;

    if (!isPlainObject(parsed)) return body;

    const fields: Record<string, unknown> = {};

    flatten(parsed, "", 0, fields);

    return JSON.stringify(fields, null, 2);
  } catch {
    return body;
  }
}
