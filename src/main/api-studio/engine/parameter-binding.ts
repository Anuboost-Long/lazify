import {
  findAnnotation,
  namedStringValue,
  readAnnotations,
  splitTopLevel,
  stringValue,
  type Annotation
} from "../reading/annotations";
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

function jsonBody(type: string, types: Record<string, string>): ApiBody {
  return {
    required: true,
    description: null,
    variants: [{ mediaType: "application/json", schemaType: schemaTypeOf(type, types), example: null }]
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

  return { parameters, headers, requestBody };
}
