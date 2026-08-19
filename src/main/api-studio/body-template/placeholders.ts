const STRING_PLACEHOLDERS: Record<string, string> = {
  date: "1970-01-01",
  "date-time": "1970-01-01T00:00:00Z",
  uuid: "00000000-0000-0000-0000-000000000000",
  email: "user@example.com",
  hostname: "example.com",
  uri: "https://example.com",
  url: "https://example.com",
  binary: "",
  byte: "",
  password: ""
};

export interface DeclaredType {
  type: string | null;
  format: string | null;
}

export function placeholderFor({ type, format }: DeclaredType): unknown {
  switch (type) {
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    case "array":
      return [];
    case "object":
      return {};
    case "null":
      return null;
    default:
      return (format ? STRING_PLACEHOLDERS[format] : undefined) ?? "string";
  }
}

/** `string (date-time)` and `array<integer>` as the scanners write them. */
export function readDeclaredType(schemaType: string): DeclaredType & { itemType: string | null } {
  const collection = schemaType.match(/^array<(.+)>$/);
  if (collection) return { type: "array", format: null, itemType: collection[1].trim() };

  const [, type, format] = schemaType.match(/^([\w]+)(?:\s*\((.+)\))?$/) ?? [];

  return { type: type ?? schemaType, format: format ?? null, itemType: null };
}
