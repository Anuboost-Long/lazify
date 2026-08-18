import { schemaTypeOf } from "../engine/parameter-binding";
import { readBaseTypes, readClassName } from "../reading/declarations";
import type { FrameworkRules } from "../rules/types";
import type { ApiParameter } from "../types";

const PROPERTY_PATTERNS = [
  /\bpublic\s+([\w<>,.\[\]?]+)\s+(\w+)\s*(?:\{\s*get;|=>)/,
  /^\s*(?:readonly\s+)?(\w+)\??\s*:\s*([\w<>\[\]| ]+);/
];

interface ModelProperty {
  name: string;
  type: string;
}

export type ModelIndex = Map<string, { properties: ModelProperty[]; baseTypes: string[] }>;

function readProperty(line: string): ModelProperty | null {
  const declared = line.match(PROPERTY_PATTERNS[0]);
  if (declared) return { type: declared[1], name: declared[2] };

  const typed = line.match(PROPERTY_PATTERNS[1]);
  if (typed) return { type: typed[2].trim(), name: typed[1] };

  return null;
}

export function indexModelProperties(sources: string[][]): ModelIndex {
  const index: ModelIndex = new Map();

  for (const lines of sources) {
    let current: { properties: ModelProperty[]; baseTypes: string[] } | null = null;

    for (const line of lines) {
      const className = readClassName(line) ?? line.match(/\binterface\s+(\w+)/)?.[1] ?? null;

      if (className) {
        current = { properties: [], baseTypes: readBaseTypes(line) };
        index.set(className, current);
        continue;
      }

      const property = current ? readProperty(line) : null;
      if (property) current!.properties.push(property);
    }
  }

  return index;
}

function collectProperties(index: ModelIndex, typeName: string, seen: Set<string>): ModelProperty[] {
  const entry = index.get(typeName);
  if (!entry || seen.has(typeName)) return [];

  seen.add(typeName);

  const inherited = entry.baseTypes.flatMap((baseType) => collectProperties(index, baseType, seen));
  const byName = new Map<string, ModelProperty>();

  for (const property of [...inherited, ...entry.properties]) byName.set(property.name, property);

  return Array.from(byName.values());
}

/** A query object binds one request parameter per property, not one per object. */
export function expandQueryParameters(
  index: ModelIndex,
  framework: FrameworkRules,
  parameters: ApiParameter[]
): ApiParameter[] {
  return parameters.flatMap((parameter) => {
    if (parameter.location !== "query" || !parameter.schemaType) return [parameter];

    const properties = collectProperties(index, parameter.schemaType, new Set<string>());
    if (properties.length === 0) return [parameter];

    return properties.map((property) => ({
      name: property.name,
      location: "query" as const,
      required: parameter.required && !property.type.endsWith("?"),
      description: null,
      schemaType: schemaTypeOf(property.type, framework.types),
      example: null
    }));
  });
}
