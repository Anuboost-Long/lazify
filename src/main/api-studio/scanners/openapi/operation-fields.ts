import type {
  ApiBody,
  ApiHeader,
  ApiParameter,
  ApiResponseDefinition,
  ParameterLocation
} from "../../types";
import { templateFromSchema } from "../../body-template";
import { resolveRecord, resolveReference } from "./reference-resolver";
import { asArray, asFlag, asJsonText, asRecord, asText } from "./values";

const PARAMETER_LOCATIONS = new Set<string>(["path", "query", "cookie"]);

export function schemaTypeOf(
  document: Record<string, unknown>,
  schemaNode: unknown
): string | null {
  const schema = resolveRecord(document, schemaNode);
  if (!schema) return null;

  const type = asText(schema.type);
  const format = asText(schema.format);

  if (type === "array") {
    const itemType = schemaTypeOf(document, schema.items);
    return itemType ? `array<${itemType}>` : "array";
  }

  if (!type) {
    if (schema.properties) return "object";
    if (schema.oneOf || schema.anyOf || schema.allOf) return "composed";
    return null;
  }

  return format ? `${type} (${format})` : type;
}

export function exampleOf(document: Record<string, unknown>, node: unknown): string | null {
  const record = asRecord(node);
  if (!record) return null;

  if (record.example !== undefined) return asJsonText(record.example);

  const namedExamples = asRecord(record.examples);
  const firstExample = namedExamples ? Object.values(namedExamples)[0] : asArray(record.examples)[0];
  const resolved = asRecord(resolveReference(document, firstExample));

  if (resolved && resolved.value !== undefined) return asJsonText(resolved.value);
  if (firstExample !== undefined && !asRecord(firstExample)?.$ref) return asJsonText(firstExample);

  return asJsonText(resolveRecord(document, record.schema)?.example);
}

export function normalizeParameters(document: Record<string, unknown>, rawParameters: unknown[]) {
  const parameters: ApiParameter[] = [];
  const headers: ApiHeader[] = [];

  for (const rawParameter of rawParameters) {
    const parameter = resolveRecord(document, rawParameter);
    const name = parameter ? asText(parameter.name) : null;
    if (!parameter || !name) continue;

    const location = asText(parameter.in);
    const required = asFlag(parameter.required) || location === "path";
    const description = asText(parameter.description);

    if (location === "header") {
      headers.push({ name, value: exampleOf(document, parameter), required, description });
      continue;
    }

    if (!location || !PARAMETER_LOCATIONS.has(location)) continue;

    parameters.push({
      name,
      location: location as ParameterLocation,
      required,
      description,
      schemaType: schemaTypeOf(document, parameter.schema),
      example: exampleOf(document, parameter)
    });
  }

  return { parameters, headers };
}

export function normalizeRequestBody(
  document: Record<string, unknown>,
  rawRequestBody: unknown
): ApiBody | null {
  const requestBody = resolveRecord(document, rawRequestBody);
  if (!requestBody) return null;

  const content = asRecord(requestBody.content) ?? {};

  return {
    required: asFlag(requestBody.required),
    description: asText(requestBody.description),
    variants: Object.entries(content).map(([mediaType, mediaTypeObject]) => ({
      mediaType,
      schemaType: schemaTypeOf(document, asRecord(mediaTypeObject)?.schema),
      example: exampleOf(document, mediaTypeObject),
      defaultBody: templateFromSchema(document, asRecord(mediaTypeObject)?.schema)
    }))
  };
}

export function normalizeResponses(
  document: Record<string, unknown>,
  rawResponses: unknown
): ApiResponseDefinition[] {
  const responses = asRecord(rawResponses) ?? {};

  return Object.entries(responses).map(([status, rawResponse]) => {
    const response = resolveRecord(document, rawResponse);

    const content = asRecord(response?.content) ?? {};
    const mediaTypes = Object.keys(content);
    const jsonType = mediaTypes.find((mediaType) => mediaType.includes("json")) ?? mediaTypes[0];
    const mediaTypeObject = jsonType ? asRecord(content[jsonType]) : null;

    return {
      status,
      description: response ? asText(response.description) : null,
      mediaTypes,
      example:
        exampleOf(document, mediaTypeObject) ??
        templateFromSchema(document, mediaTypeObject?.schema)
    };
  });
}
