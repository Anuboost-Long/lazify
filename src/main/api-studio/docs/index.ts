import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { readCollectionBody, readCustomCollections } from "../custom-collections";
import type { CustomCollection, CustomRequest } from "../custom-collections";
import { buildDocBrief, briefFiles, mergeAgentDraft, readAgentDraft, writeDocBrief } from "./brief";
import { pruneStoredDocs, readStoredDoc, writeStoredDoc } from "./doc-store";
import { docGaps, heldRequests, syncedDoc } from "./outline";
import { docQuestionPrompt } from "./questions";
import { buildDocumentHtml, type DocRouteInput } from "./render/document";
import { writeDocPdf } from "./render/pdf";
import type {
  CollectionDoc,
  DocBrief,
  DocBriefFiles,
  DocExport,
  DocFormat,
  DocImportResult,
  DocState
} from "./types";

function collectionOf(projectPath: string, collectionId: string): CustomCollection | null {
  return (
    readCustomCollections(projectPath).find((collection) => collection.id === collectionId) ?? null
  );
}

function stateOf(collection: CustomCollection, doc: CollectionDoc): DocState {
  return { doc, gaps: docGaps(collection, doc) };
}

export function readCollectionDoc(projectPath: string, collectionId: string): DocState | null {
  const collection = collectionOf(projectPath, collectionId);

  if (!collection) return null;

  return stateOf(collection, syncedDoc(collection, readStoredDoc(projectPath, collectionId)));
}

export function saveCollectionDoc(projectPath: string, doc: CollectionDoc): DocState | null {
  const collection = collectionOf(projectPath, doc.collectionId);

  if (!collection) return null;

  const kept = writeStoredDoc(projectPath, { ...doc, updatedAt: new Date().toISOString() });

  return stateOf(collection, syncedDoc(collection, kept));
}

function withExampleBodies(projectPath: string, request: CustomRequest): CustomRequest {
  return {
    ...request,
    examples: request.examples.map((example) => {
      if (example.body || !example.bodyFile) return example;

      try {
        return { ...example, body: readCollectionBody(projectPath, example.bodyFile) };
      } catch {
        return example;
      }
    })
  };
}

function routeInputs(
  projectPath: string,
  collection: CustomCollection,
  doc: CollectionDoc
): DocRouteInput[] {
  const entries = new Map(doc.routes.map((route) => [route.requestId, route]));

  return heldRequests(collection).flatMap(({ request, folder }) => {
    const entry = entries.get(request.id);

    if (!entry) return [];

    return [{ entry: { ...entry, folder }, request: withExampleBodies(projectPath, request) }];
  });
}

export function renderCollectionDoc(projectPath: string, collectionId: string): string | null {
  const collection = collectionOf(projectPath, collectionId);
  const state = readCollectionDoc(projectPath, collectionId);

  if (!collection || !state) return null;

  return buildDocumentHtml({
    doc: state.doc,
    routes: routeInputs(projectPath, collection, state.doc),
    generatedAt: new Date().toISOString().slice(0, 10)
  });
}

export function writeDocPreviewFile(projectPath: string, collectionId: string): string | null {
  const html = renderCollectionDoc(projectPath, collectionId);

  if (!html) return null;

  const filePath = path.join(os.tmpdir(), `lazify-api-doc-${collectionId}.html`);

  fs.writeFileSync(filePath, html, "utf8");

  return filePath;
}

export async function exportCollectionDoc(
  projectPath: string,
  collectionId: string,
  format: DocFormat,
  filePath: string
): Promise<DocExport | null> {
  const state = readCollectionDoc(projectPath, collectionId);
  const html = renderCollectionDoc(projectPath, collectionId);

  if (!state || !html) return null;

  if (format === "pdf") await writeDocPdf(html, state.doc.theme, state.doc.title, filePath);
  else fs.writeFileSync(filePath, html, "utf8");

  return { filePath, format, routes: state.doc.routes.length };
}

export function collectionDocQuestions(
  projectPath: string,
  collectionId: string,
  keys: string[]
): string | null {
  const state = readCollectionDoc(projectPath, collectionId);

  return state ? docQuestionPrompt(projectPath, collectionId, state.doc, state.gaps, keys) : null;
}

export function collectionDocBrief(projectPath: string, collectionId: string): DocBrief | null {
  const collection = collectionOf(projectPath, collectionId);
  const state = readCollectionDoc(projectPath, collectionId);

  return collection && state ? buildDocBrief(projectPath, collection, state.doc) : null;
}

export function writeCollectionDocBrief(
  projectPath: string,
  collectionId: string
): DocBriefFiles | null {
  const collection = collectionOf(projectPath, collectionId);
  const state = readCollectionDoc(projectPath, collectionId);

  return collection && state ? writeDocBrief(projectPath, collection, state.doc) : null;
}

export function importCollectionDocDraft(
  projectPath: string,
  collectionId: string,
  filePath?: string,
  onlyEmpty = false
): DocImportResult | null {
  const collection = collectionOf(projectPath, collectionId);
  const state = readCollectionDoc(projectPath, collectionId);

  if (!collection || !state) return null;

  const source = filePath || briefFiles(projectPath, collection).answerPath;

  if (!fs.existsSync(source)) return null;

  const merged = mergeAgentDraft(state.doc, readAgentDraft(source), onlyEmpty);

  // Polled as well as watched: a pass that changes nothing must not churn the store.
  if (merged.filled === 0) return { ...merged, doc: state.doc };

  const kept = writeStoredDoc(projectPath, merged.doc);

  return { ...merged, doc: syncedDoc(collection, kept) };
}

export { DOC_PRESETS, DEFAULT_DOC_PRESET_ID, docPreset } from "./presets";
export { COLLECTION_SECTIONS, ROUTE_SECTIONS, sectionsFor, sectionSpec, sectionTitle } from "./sections";
export { DEFAULT_THEME } from "./doc-store";

export function pruneCollectionDocs(projectPath: string, collections: CustomCollection[]): void {
  pruneStoredDocs(
    projectPath,
    collections.map((collection) => collection.id)
  );
}
export { briefFiles } from "./brief";
export { docGaps, heldRequests, syncedDoc } from "./outline";
export { gapKey } from "./gap-key";
export type * from "./types";
