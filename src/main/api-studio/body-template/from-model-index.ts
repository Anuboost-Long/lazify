import { schemaTypeOf } from "../engine/parameter-binding";
import type { EnumMember, ModelIndex } from "../scanners/model-index";
import { collectProperties } from "../scanners/model-index";
import { placeholderFor, readDeclaredType } from "./placeholders";
import { applyNaming } from "./property-names";
import type { SerializationPolicy } from "./serialization-policy";

const MAX_DEPTH = 8;
const PRIMITIVE_TYPES = new Set(["string", "integer", "number", "boolean", "null"]);

export interface ModelBodyOptions extends SerializationPolicy {
  types: Record<string, string>;
}

/** C# numbers members from the last explicit value, and defaults to the zero one. */
function defaultMember(members: EnumMember[]) {
  let next = 0;
  const numbered = members.map((member) => {
    const value = member.value ?? next;
    next = value + 1;

    return { name: member.name, value, text: member.text };
  });

  return numbered.find((member) => member.value === 0) ?? numbered[0] ?? null;
}

/** An enum nothing could be read from still defaults to zero, as C# does. */
function enumValue(members: EnumMember[], stringEnums: boolean): unknown {
  const member = defaultMember(members);
  if (!member) return 0;
  if (member.text !== null) return member.text;

  return stringEnums ? member.name : member.value;
}

/** A binding may name the type as the code sees it: `Models.LoginRequest`. */
function modelNameFor(index: ModelIndex, schemaType: string): string | null {
  if (index.has(schemaType)) return schemaType;

  const bare = schemaType.split(".").pop();

  return bare && index.has(bare) ? bare : null;
}

function valueFor(
  index: ModelIndex,
  options: ModelBodyOptions,
  schemaType: string,
  depth: number,
  seen: Set<string>
): unknown {
  const declared = readDeclaredType(schemaType);

  if (declared.itemType) {
    const item = valueFor(index, options, declared.itemType, depth + 1, seen);
    return item === null || item === undefined ? [] : [item];
  }

  const name = modelNameFor(index, schemaType);
  const model = name ? index.get(name) : null;

  if (model?.enumMembers) return enumValue(model.enumMembers, options.stringEnums);

  /** Undefined says the project declares this type somewhere the scan cannot read. */
  if (!model || !name) {
    return PRIMITIVE_TYPES.has(declared.type ?? "") ? placeholderFor(declared) : undefined;
  }

  if (depth > MAX_DEPTH || seen.has(name)) return null;

  const nested = new Set([...seen, name]);
  const value: Record<string, unknown> = {};

  for (const property of collectProperties(index, name, new Set())) {
    const name = property.jsonName ?? applyNaming(property.name, options.naming);

    const propertyValue = valueFor(
      index,
      options,
      schemaTypeOf(property.type, options.types),
      depth + 1,
      nested
    );

    value[name] = propertyValue === undefined ? {} : propertyValue;
  }

  return value;
}

export function templateFromModel(
  index: ModelIndex,
  options: ModelBodyOptions,
  schemaType: string | null
): string | null {
  if (!schemaType) return null;

  const value = valueFor(index, options, schemaType, 0, new Set());

  return value === null || value === undefined ? null : JSON.stringify(value, null, 2);
}
