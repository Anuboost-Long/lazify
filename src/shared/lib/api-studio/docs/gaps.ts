import type { CustomCollection, CustomRequest } from "../custom-collections";
import { FOLDER_SECTION } from "./sections";
import type { CollectionDoc, DocGap, DocRouteEntry } from "./types";

export interface HeldRequest {
  request: CustomRequest;
  folderId: string;
  folder: string;
}

export function heldRequests(collection: CustomCollection): HeldRequest[] {
  return [
    ...collection.requests.map((request) => ({ request, folderId: "", folder: "" })),
    ...collection.folders.flatMap((folder) =>
      folder.requests.map((request) => ({ request, folderId: folder.id, folder: folder.name }))
    )
  ];
}

function missing(sections: Record<string, string>, id: string): boolean {
  return !sections[id]?.trim();
}

function routeGaps(held: HeldRequest, entry: DocRouteEntry): DocGap[] {
  const route = held.request.route;
  const where = `${route.method} ${route.path}`;
  const found: DocGap[] = [];
  const add = (sectionId: string, question: string) =>
    found.push({ requestId: held.request.id, sectionId, where, question });

  if (missing(entry.sections, "purpose")) {
    add("purpose", "Nothing in the code says what this route does. What does it do for the caller?");
  }

  if (route.security.length === 0 && missing(entry.sections, "auth")) {
    add("auth", "No authentication was detected. Is this route public, or what does it require?");
  }

  if (
    (route.responses ?? []).length === 0 &&
    held.request.examples.length === 0 &&
    missing(entry.sections, "responses")
  ) {
    add("responses", "No response shape was detected. What comes back on success?");
  }

  const body = route.requestBody;

  if (body && !body.description?.trim() && missing(entry.sections, "request_body")) {
    add("request_body", "The request body has no description in the code. What does it carry?");
  }

  const unnamed = (route.parameters ?? []).filter((parameter) => !parameter.description?.trim());

  if (unnamed.length > 0 && missing(entry.sections, "parameters")) {
    add(
      "parameters",
      `${unnamed.map((parameter) => parameter.name).join(", ")} — what do these parameters take?`
    );
  }

  return found;
}

export function docGaps(collection: CustomCollection, doc: CollectionDoc): DocGap[] {
  const entries = new Map(doc.routes.map((route) => [route.requestId, route]));
  const collectionGaps: DocGap[] = [];
  const ask = (sectionId: string, question: string) => {
    if (missing(doc.sections, sectionId)) {
      collectionGaps.push({ requestId: null, sectionId, where: doc.title || collection.name, question });
    }
  };

  ask("overview", "What is this API for, and who calls it?");
  ask("authentication", "How does a caller prove who they are?");
  ask("errors", "What does an error response look like?");

  const folderGaps: DocGap[] = doc.folders
    .filter((folder) => !folder.description.trim())
    .map((folder) => ({
      requestId: null,
      folderId: folder.id,
      sectionId: FOLDER_SECTION.id,
      where: folder.name,
      question: `What do the routes in ${folder.name || "this folder"} have in common?`
    }));

  return [
    ...collectionGaps,
    ...folderGaps,
    ...heldRequests(collection).flatMap((held) => {
      const entry = entries.get(held.request.id);

      return entry ? routeGaps(held, entry) : [];
    })
  ];
}
