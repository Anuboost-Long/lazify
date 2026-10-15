import { docGaps, heldRequests } from "./outline";
import { COLLECTION_SECTIONS, FOLDER_SECTION, ROUTE_SECTIONS } from "./sections";
import type { CustomCollection } from "../custom-collections";
import type { CollectionDoc, DocGap, DocSectionSpec } from "./types";

interface JobSection {
  id: string;
  title: string;
  write: string;
  rule: string;
  required: boolean;
  current: string;
}

interface JobRoute {
  requestId: string;
  name: string;
  folder: string;
  method: string;
  path: string;
  summary: string | null;
  description: string | null;
  source: { file: string | null; line: number | null; adapter: string; confidence: string };
  security: string[];
  parameters: Array<{ name: string; in: string; required: boolean; type: string | null; description: string | null }>;
  headers: Array<{ name: string; required: boolean; description: string | null }>;
  requestBody: { required: boolean; mediaTypes: string[]; sample: string | null } | null;
  responses: Array<{ status: string; mediaTypes: string[]; description: string | null }>;
  examples: Array<{ name: string; status: number; mediaType: string | null }>;
  sections: JobSection[];
}

interface JobFolder {
  id: string;
  name: string;
  write: string;
  rule: string;
  current: string;
}

export interface DocJob {
  collection: string;
  title: string;
  version: string;
  baseUrl: string;
  sections: JobSection[];
  folders: JobFolder[];
  routes: JobRoute[];
  questions: DocGap[];
}

function sectionsOf(specs: DocSectionSpec[], written: Record<string, string>): JobSection[] {
  return specs.map((spec) => ({
    id: spec.id,
    title: spec.title,
    write: spec.hint,
    rule: spec.rule,
    required: spec.required,
    current: written[spec.id] ?? ""
  }));
}

export function buildDocJob(collection: CustomCollection, doc: CollectionDoc): DocJob {
  const entries = new Map(doc.routes.map((route) => [route.requestId, route]));

  return {
    collection: collection.name,
    title: doc.title || collection.name,
    version: doc.version,
    baseUrl: doc.baseUrl,
    sections: sectionsOf(COLLECTION_SECTIONS, doc.sections),
    folders: doc.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      write: FOLDER_SECTION.hint,
      rule: FOLDER_SECTION.rule,
      current: folder.description
    })),
    routes: heldRequests(collection).map(({ request, folder }) => {
      const route = request.route;
      const body = route.requestBody;

      return {
        requestId: request.id,
        name: request.name,
        folder,
        method: route.method,
        path: route.path,
        summary: route.summary,
        description: route.description ?? null,
        source: {
          file: route.source.filePath,
          line: route.source.line,
          adapter: route.source.adapter,
          confidence: route.source.confidence
        },
        security: route.security.map((scheme) => `${scheme.kind}:${scheme.parameterName}`),
        parameters: (route.parameters ?? []).map((parameter) => ({
          name: parameter.name,
          in: parameter.location,
          required: parameter.required,
          type: parameter.schemaType,
          description: parameter.description
        })),
        headers: route.headers.map((header) => ({
          name: header.name,
          required: header.required,
          description: header.description
        })),
        requestBody: body
          ? {
              required: body.required,
              mediaTypes: body.variants.map((variant) => variant.mediaType),
              sample: body.variants[0]?.defaultBody ?? body.variants[0]?.example ?? null
            }
          : null,
        responses: (route.responses ?? []).map((response) => ({
          status: response.status,
          mediaTypes: response.mediaTypes,
          description: response.description
        })),
        examples: request.examples.map((example) => ({
          name: example.name,
          status: example.status,
          mediaType: example.mediaType
        })),
        sections: sectionsOf(ROUTE_SECTIONS, entries.get(request.id)?.sections ?? {})
      };
    }),
    questions: docGaps(collection, doc)
  };
}
