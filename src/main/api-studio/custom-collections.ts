import { app } from "electron";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { bodyFileName, hasBody, readBody, writeBody } from "./response-bodies";
import { normalizedExamples, type SavedExample } from "./request-store";
import type { BodyMode, FormEntry } from "./runner";
import { EMPTY_SCRIPTS, type RouteScripts } from "./scripting/types";
import type { SavedRoute } from "./types";

const STORE_FILE = "api-studio-collections.json";
const BODY_DIRECTORY = "api-studio-collection-bodies";
const STORE_VERSION = 1;
const MAX_EXAMPLES = 10;

export interface CustomRequestDraft {
  mode: BodyMode;
  json: string;
  entries: FormEntry[];
  fields: Record<string, string>;
  scripts: RouteScripts;
  savedAt: string;
}

export interface CustomRequest {
  id: string;
  name: string;
  routeId: string | null;
  route: SavedRoute;
  draft: CustomRequestDraft | null;
  examples: SavedExample[];
}

export interface CustomFolder {
  id: string;
  name: string;
  requests: CustomRequest[];
}

export interface CustomCollection {
  id: string;
  name: string;
  folders: CustomFolder[];
  requests: CustomRequest[];
}

interface CollectionsStore {
  version: number;
  projects: Record<string, CustomCollection[]>;
}

function storePath() {
  return path.join(app.getPath("userData"), STORE_FILE);
}

function projectKey(projectPath: string) {
  return path.resolve(projectPath);
}

function bodyDirectory(projectPath: string) {
  const key = createHash("sha1").update(projectKey(projectPath)).digest("hex").slice(0, 12);

  return path.join(app.getPath("userData"), BODY_DIRECTORY, key);
}

export function readCollectionBody(projectPath: string, bodyFile: string): string {
  return readBody(bodyDirectory(projectPath), bodyFile);
}

function detached(request: CustomRequest, directory: string): SavedExample[] {
  return request.examples.slice(-MAX_EXAMPLES).map((example) => {
    const fileName = example.bodyFile ?? bodyFileName(request.id, example.id);

    if (example.body || !hasBody(directory, fileName)) {
      writeBody(directory, fileName, example.body);
    }

    return { ...example, body: "", bodyFile: fileName };
  });
}

function pruneBodyDirectory(directory: string, keep: Set<string>) {
  let entries: string[];

  try {
    entries = fs.readdirSync(directory);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (keep.has(entry)) continue;

    fs.rmSync(path.join(directory, entry), { force: true });
  }
}

function draftFrom(draft: Partial<CustomRequestDraft> | null | undefined): CustomRequestDraft | null {
  if (!draft) return null;

  return {
    mode: draft.mode ?? "json",
    json: draft.json ?? "",
    entries: draft.entries ?? [],
    fields: draft.fields ?? {},
    scripts: {
      pre: draft.scripts?.pre ?? EMPTY_SCRIPTS.pre,
      post: draft.scripts?.post ?? EMPTY_SCRIPTS.post
    },
    savedAt: draft.savedAt ?? new Date(0).toISOString()
  };
}

function requestsFrom(requests: CustomRequest[] | undefined): CustomRequest[] {
  return (requests ?? [])
    .filter((request) => request?.id && request.route)
    .map((request) => ({
      id: request.id,
      name: request.name || request.route.path,
      routeId: request.routeId ?? null,
      route: request.route,
      draft: draftFrom(request.draft),
      examples: normalizedExamples(request.examples)
    }));
}

function normalized(collections: CustomCollection[] | undefined): CustomCollection[] {
  return (collections ?? [])
    .filter((collection) => collection?.id)
    .map((collection) => ({
      id: collection.id,
      name: collection.name || "",
      folders: (collection.folders ?? [])
        .filter((folder) => folder?.id)
        .map((folder) => ({
          id: folder.id,
          name: folder.name || "",
          requests: requestsFrom(folder.requests)
        })),
      requests: requestsFrom(collection.requests)
    }));
}

function readStore(): CollectionsStore {
  try {
    const parsed = JSON.parse(fs.readFileSync(storePath(), "utf8")) as Partial<CollectionsStore>;

    return {
      version: STORE_VERSION,
      projects: parsed?.version === STORE_VERSION ? (parsed.projects ?? {}) : {}
    };
  } catch {
    return { version: STORE_VERSION, projects: {} };
  }
}

function writeStore(store: CollectionsStore) {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  fs.writeFileSync(storePath(), `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
}

export function readCustomCollections(projectPath: string): CustomCollection[] {
  return normalized(readStore().projects[projectKey(projectPath)]);
}

function withDetachedBodies(projectPath: string, collections: CustomCollection[]) {
  const directory = bodyDirectory(projectPath);
  const files = new Set<string>();
  const detachRequests = (requests: CustomRequest[]) =>
    requests.map((request) => {
      const examples = detached(request, directory);

      for (const example of examples) {
        if (example.bodyFile) files.add(example.bodyFile);
      }

      return { ...request, examples };
    });

  const kept = collections.map((collection) => ({
    ...collection,
    requests: detachRequests(collection.requests),
    folders: collection.folders.map((folder) => ({
      ...folder,
      requests: detachRequests(folder.requests)
    }))
  }));

  pruneBodyDirectory(directory, files);

  return kept;
}

export function saveCustomCollections(
  projectPath: string,
  collections: CustomCollection[]
): CustomCollection[] {
  const store = readStore();
  const kept = withDetachedBodies(projectPath, normalized(collections));

  if (kept.length === 0) delete store.projects[projectKey(projectPath)];
  else store.projects[projectKey(projectPath)] = kept;

  writeStore(store);

  return kept;
}
