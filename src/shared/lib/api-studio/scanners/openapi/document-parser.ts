import { parseYamlDocument } from "../../yaml";
import type { ProjectInventory } from "../../types";
import { asRecord, asText } from "./values";

export interface OpenApiDocument {
  relativePath: string;
  version: string;
  content: Record<string, unknown>;
  rawText: string;
}

function parseByExtension(relativePath: string, rawText: string): unknown {
  const isJson = relativePath.toLowerCase().endsWith(".json");

  try {
    return isJson ? JSON.parse(rawText) : parseYamlDocument(rawText);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${relativePath} could not be read as ${isJson ? "JSON" : "YAML"}: ${detail}`);
  }
}

export async function parseOpenApiDocument(
  project: ProjectInventory,
  relativePath: string
): Promise<OpenApiDocument> {
  const rawText = await project.readFile(relativePath);
  const content = asRecord(parseByExtension(relativePath, rawText));

  if (!content) {
    throw new Error(`${relativePath} is not an API description document.`);
  }

  const version = asText(content.openapi);

  if (!version) {
    const swaggerVersion = asText(content.swagger);

    if (swaggerVersion) {
      throw new Error(
        `${relativePath} is Swagger ${swaggerVersion}. Convert it to OpenAPI 3 to import it here.`
      );
    }

    throw new Error(`${relativePath} has no "openapi" version field.`);
  }

  if (!version.startsWith("3.")) {
    throw new Error(`${relativePath} declares OpenAPI ${version}. Only OpenAPI 3.x is supported.`);
  }

  return { relativePath, version, content, rawText };
}
