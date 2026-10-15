import type { CustomCollection, CustomRequest } from "../custom-collections";
import { DEFAULT_THEME, normalizedDoc } from "./doc-store";
import { heldRequests, type HeldRequest } from "./gaps";
import type { CollectionDoc, DocFolderEntry, DocRouteEntry } from "./types";

function foldersOf(collection: CustomCollection, kept: DocFolderEntry[]): DocFolderEntry[] {
  const held = new Map(kept.map((folder) => [folder.id, folder]));

  return collection.folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    description: held.get(folder.id)?.description ?? ""
  }));
}

function detectedPurpose(request: CustomRequest): string {
  const written = request.route.description?.trim() || request.route.summary?.trim() || "";

  return written && written !== request.route.path ? written : "";
}

function entryFor(held: HeldRequest, kept: DocRouteEntry | undefined): DocRouteEntry {
  const sections = { ...kept?.sections };
  const purpose = detectedPurpose(held.request);

  if (!sections.purpose?.trim() && purpose) sections.purpose = purpose;

  return {
    requestId: held.request.id,
    title: held.request.name || held.request.route.path,
    folderId: held.folderId,
    folder: held.folder,
    sections,
    writtenBy: kept?.writtenBy ?? "detected",
    updatedAt: kept?.updatedAt ?? new Date(0).toISOString()
  };
}

export function syncedDoc(
  collection: CustomCollection,
  stored: CollectionDoc | null
): CollectionDoc {
  const base = stored
    ? normalizedDoc(stored, collection.id)
    : {
        collectionId: collection.id,
        title: collection.name,
        subtitle: "",
        version: "",
        baseUrl: "",
        presetId: "",
        sections: {},
        folders: [],
        routes: [],
        theme: DEFAULT_THEME,
        updatedAt: new Date(0).toISOString()
      };
  const kept = new Map(base.routes.map((route) => [route.requestId, route]));

  return {
    ...base,
    title: base.title || collection.name,
    folders: foldersOf(collection, base.folders),
    routes: heldRequests(collection).map((held) => entryFor(held, kept.get(held.request.id)))
  };
}

export { docGaps, heldRequests } from "./gaps";
export type { HeldRequest } from "./gaps";
