import { schemaTypeOf } from "../engine/parameter-binding";
import { readBaseTypes, readClassName } from "../reading/declarations";
import type { FrameworkRules } from "../rules/types";
import type { ApiParameter } from "../types";

const CSHARP_MODIFIERS = "(?:required|virtual|override|static|readonly|new|abstract|sealed|const|async)\\s+";
const PROPERTY_PATTERNS = [
  new RegExp(
    `\\bpublic\\s+(?:${CSHARP_MODIFIERS})*([\\w<>,.\\[\\]?]+)\\s+(\\w+)\\s*(?:\\{|=>|=[^=]|;)`
  ),
  /^\s*(?:readonly\s+)?(\w+)\??\s*:\s*([\w<>\[\]| ]+);/,
  /^\s*(?:public|protected|private)\s+(?:readonly\s+)?\??([\w|\\]+)\s+\$(\w+)\s*[;=]/,
  /^\s*(\w+)\s*:\s*([\w\[\], |.]+?)\s*(?:=.*)?$/
];
const ENUM_PATTERN = /\benum\s+(\w+)/;
const ENUM_MEMBER_PATTERN =
  /^\s*([A-Za-z_]\w*)\s*(?:=\s*(?:(-?\d+|0[xX][0-9a-fA-F]+)|['"]([^'"]*)['"]))?\s*,?\s*$/;

interface ModelProperty {
  name: string;
  type: string;
  jsonName: string | null;
}

export interface EnumMember {
  name: string;
  value: number | null;
  /** A backed enum states what goes on the wire, whatever its member is called. */
  text: string | null;
}

export interface ModelEntry {
  properties: ModelProperty[];
  baseTypes: string[];
  enumMembers: EnumMember[] | null;
}

export type ModelIndex = Map<string, ModelEntry>;

const IGNORED_PROPERTY_NAMES = new Set(["class", "return", "if", "else", "import", "from", "def"]);

/** C# and PHP name the type first, TypeScript and Python name it second. */
function readProperty(line: string): Omit<ModelProperty, "jsonName"> | null {
  const declared = line.match(PROPERTY_PATTERNS[0]);
  if (declared) return { type: declared[1], name: declared[2] };

  const php = line.match(PROPERTY_PATTERNS[2]);
  if (php) return { type: php[1].replace(/^\\/, ""), name: php[2] };

  const typed = line.match(PROPERTY_PATTERNS[1]) ?? line.match(PROPERTY_PATTERNS[3]);
  if (typed && !IGNORED_PROPERTY_NAMES.has(typed[1])) {
    return { type: typed[2].trim(), name: typed[1] };
  }

  return null;
}

function readJsonName(line: string, annotations: string[]): string | null {
  for (const annotation of annotations) {
    const named = line.match(new RegExp(`${annotation}\\s*\\(\\s*"([^"]+)"`));
    if (named) return named[1];
  }

  return null;
}

/** `public record LoginRequest(string Username, string Password);` */
function readPositionalProperties(line: string): Array<Omit<ModelProperty, "jsonName">> {
  const open = line.indexOf("(");
  if (open === -1) return [];

  const parameters = line.slice(open + 1).split(")")[0];

  return parameters
    .split(",")
    .map((parameter) => parameter.replace(/\[[^\]]*\]/g, "").split("=")[0].trim())
    .map((parameter) => parameter.split(/\s+/).filter(Boolean))
    .filter((parts) => parts.length >= 2)
    .map((parts) => ({ type: parts[parts.length - 2], name: parts[parts.length - 1] }));
}

function readEnumMember(line: string): EnumMember | null {
  const text = line.split("//")[0];
  const member = text.match(ENUM_MEMBER_PATTERN);
  if (!member) return null;

  return {
    name: member[1],
    value: member[2] === undefined ? null : Number(member[2]),
    text: member[3] ?? null
  };
}

/** `enum Status { Unknown = 0, Active = 1 }` states its members on its own line. */
function readInlineMembers(line: string): EnumMember[] {
  const body = line.slice(line.indexOf("{") + 1).split("}")[0];
  if (!line.includes("{")) return [];

  return body
    .split(",")
    .map((member) => readEnumMember(member.trim()))
    .filter((member): member is EnumMember => member !== null);
}

export function indexModelProperties(
  sources: string[][],
  framework: FrameworkRules
): ModelIndex {
  const index: ModelIndex = new Map();
  const nameAnnotations = framework.serialization?.nameAnnotations ?? [];

  for (const lines of sources) {
    let current: ModelEntry | null = null;
    let enclosing: ModelEntry | null = null;
    let jsonName: string | null = null;

    for (const line of lines) {
      const enumName =
        line.match(ENUM_PATTERN)?.[1] ??
        line.match(/^\s*class\s+(\w+)\s*\([^)]*\bEnum\b[^)]*\)\s*:/)?.[1] ??
        null;
      const className =
        readClassName(line) ??
        line.match(/\binterface\s+(\w+)/)?.[1] ??
        line.match(/^\s*class\s+(\w+)\s*(?:\(([^)]*)\))?\s*:/)?.[1] ??
        null;

      if (enumName || className) {
        enclosing = enumName ? (current?.enumMembers ? enclosing : current) : null;
        current = {
          properties: enumName
            ? []
            : readPositionalProperties(line).map((property) => ({ ...property, jsonName: null })),
          baseTypes: enumName ? [] : readBaseTypes(line),
          enumMembers: enumName ? readInlineMembers(line) : null
        };
        index.set(enumName ?? className!, current);
        jsonName = null;
        continue;
      }

      if (!current) continue;

      jsonName = readJsonName(line, nameAnnotations) ?? jsonName;

      const property = readProperty(line);

      if (current.enumMembers && !property) {
        const member = readEnumMember(line);
        if (member) current.enumMembers.push(member);
        continue;
      }

      /** A property after a nested enum belongs to the class that declared it. */
      if (current.enumMembers && enclosing) current = enclosing;

      if (property && !current.enumMembers) {
        current.properties.push({ ...property, jsonName });
        jsonName = null;
      }
    }
  }

  return index;
}

export function collectProperties(
  index: ModelIndex,
  typeName: string,
  seen: Set<string>
): ModelProperty[] {
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
