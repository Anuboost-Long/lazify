import {
  findAnnotation,
  namedStringValue,
  readAnnotations,
  splitTopLevel,
  stringValue,
  type Annotation
} from "../reading/annotations";
import { placeholderFor, readDeclaredType } from "../body-template/placeholders";
import type { AnnotationRules, FrameworkRules } from "../rules/types";
import type { ApiBody, ApiHeader, ApiParameter } from "../types";

export interface BoundParameters {
  parameters: ApiParameter[];
  headers: ApiHeader[];
  requestBody: ApiBody | null;
}

interface SignatureArgument {
  type: string;
  name: string;
  optional: boolean;
  annotations: Annotation[];
}

export function schemaTypeOf(type: string, types: Record<string, string>): string {
  const collection = type.match(
    /^(?:List|IEnumerable|ICollection|IList|IReadOnlyList|Array)<(.+)>$/
  );
  if (collection) return `array<${schemaTypeOf(collection[1].trim(), types)}>`;
  if (type.endsWith("[]")) return `array<${schemaTypeOf(type.slice(0, -2), types)}>`;

  const bare = type.replace(/\?$/, "").replace(/^System\./, "");

  return types[bare.toLowerCase()] ?? bare;
}

/** `[FromQuery] string? q = ""` and `@Query('q') q?: string` reduced to one shape. */
function readArgument(text: string, rules: AnnotationRules): SignatureArgument | null {
  const annotations = readAnnotations(text, rules.syntax);
  const declaration =
    rules.syntax === "decorator"
      ? text.replace(/@[A-Za-z_$][\w$.]*\s*(\([^)]*\))?/g, " ")
      : text.replace(/\[[^\]]+\]/g, " ");
  const [beforeDefault, ...defaultValue] = declaration.split("=");

  if (rules.syntax === "decorator") {
    const [name, ...typeParts] = beforeDefault.split(":");
    const identifier = name.trim().replace(/[?.]+$/, "");

    if (!identifier) return null;

    return {
      type: typeParts.join(":").trim() || "string",
      name: identifier,
      optional: name.includes("?") || defaultValue.length > 0,
      annotations
    };
  }

  const parts = beforeDefault
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0 && part !== "params");

  if (parts.length < 2) return null;

  const type = parts.slice(0, -1).join(" ");

  return {
    type,
    name: parts[parts.length - 1],
    optional: defaultValue.length > 0 || type.endsWith("?"),
    annotations
  };
}

function boundName(argument: SignatureArgument, annotation: Annotation, rules: AnnotationRules) {
  if (rules.binding.nameFrom === "annotationArgument") {
    return stringValue(annotation.args[0]) ?? argument.name;
  }

  return namedStringValue(annotation, "Name") ?? argument.name;
}

const URLENCODED = "application/x-www-form-urlencoded";
const MULTIPART = "multipart/form-data";

interface FormField {
  name: string;
  type: string;
  file: boolean;
}

/**
 * A form is a set of fields, not one model: an action may bind a DTO, a couple
 * of loose values and a file, and all of them travel in the same body.
 */
function formBody(
  model: string | null,
  fields: FormField[],
  types: Record<string, string>
): ApiBody {
  const declared = Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.file ? "" : placeholderFor(readDeclaredType(schemaTypeOf(field.type, types)))
    ])
  );

  return {
    required: true,
    description: null,
    variants: [
      {
        mediaType: fields.some((field) => field.file) ? MULTIPART : URLENCODED,
        schemaType: model ? schemaTypeOf(model, types) : null,
        example: null,
        defaultBody: fields.length > 0 ? JSON.stringify(declared, null, 2) : null
      }
    ]
  };
}

function jsonBody(type: string, types: Record<string, string>): ApiBody {
  return {
    required: true,
    description: null,
    variants: [
      {
        mediaType: "application/json",
        schemaType: schemaTypeOf(type, types),
        example: null,
        defaultBody: null
      }
    ]
  };
}

export function bindSignature(
  signature: string,
  framework: FrameworkRules,
  templateNames: Set<string>,
  bodyBearing: boolean
): BoundParameters {
  const rules = framework.annotations;
  const parameters: ApiParameter[] = [];
  const headers: ApiHeader[] = [];
  const formFields: FormField[] = [];
  let formModel: string | null = null;
  let requestBody: ApiBody | null = null;

  if (!rules) return { parameters, headers, requestBody };

  for (const argumentText of splitTopLevel(signature, ",")) {
    const argument = readArgument(argumentText, rules);
    if (!argument) continue;

    const bound = Object.entries(rules.binding.annotations)
      .map(([name, target]) => {
        const annotation = findAnnotation(argument.annotations, name);
        return annotation ? { annotation, target } : null;
      })
      .find((entry) => entry !== null);

    if (bound?.target === "ignore") continue;

    if (bound?.target === "header") {
      headers.push({
        name: boundName(argument, bound.annotation, rules),
        value: null,
        required: !argument.optional,
        description: null
      });
      continue;
    }

    if (bound?.target === "body") {
      requestBody = jsonBody(argument.type, framework.types);
      continue;
    }

    const bare = argument.type.replace(/\?$/, "").replace(/<.*/, "").toLowerCase();
    /** `List<IFormFile>` is a file field too: the wrapper is not what it holds. */
    const isFile = argument.type
      .toLowerCase()
      .split(/[<>[\],\s]+/)
      .some((token) => rules.binding.fileTypes.includes(token.replace(/\?$/, "")));

    /** A file is part of the request wherever it appears, annotated or not. */
    if (bound?.target === "form" || isFile) {
      const named = bound ? boundName(argument, bound.annotation, rules) : argument.name;

      /** One form binds one model; the rest are fields, and the first one holds. */
      if (!isFile && !framework.types[bare]) formModel ??= argument.type;
      else formFields.push({ name: named, type: argument.type, file: isFile });

      continue;
    }

    if (bound?.target === "query" || bound?.target === "cookie") {
      parameters.push({
        name: boundName(argument, bound.annotation, rules),
        location: bound.target,
        required: !argument.optional,
        description: null,
        schemaType: schemaTypeOf(argument.type, framework.types),
        example: null
      });
      continue;
    }

    if (bound?.target === "path" || templateNames.has(argument.name)) continue;

    const bareType = argument.type.replace(/\?$/, "").toLowerCase();

    if (rules.binding.ignoredTypes.includes(bareType.replace(/<.*/, ""))) continue;

    if (framework.types[bareType]) {
      parameters.push({
        name: argument.name,
        location: "query",
        required: !argument.optional,
        description: null,
        schemaType: schemaTypeOf(argument.type, framework.types),
        example: null
      });
      continue;
    }

    if (rules.binding.inferBodyFromModel && bodyBearing && !requestBody) {
      requestBody = jsonBody(argument.type, framework.types);
    }
  }

  if (formFields.length > 0 || formModel) {
    requestBody = formBody(formModel, formFields, framework.types);
  }

  return { parameters, headers, requestBody };
}
