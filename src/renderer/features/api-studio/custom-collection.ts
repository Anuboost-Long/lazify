import type { SavedRoute } from "./types";
import type {
  CustomCollection,
  CustomFolder,
  CustomRequest,
  CustomRequestDraft
} from "@main/api-studio/custom-collections";

export type { CustomCollection, CustomFolder, CustomRequest, CustomRequestDraft };

export type CollectionMode = "discovered" | "custom";

export interface OpenExample {
  ownerId: string;
  id: string;
}

export interface CollectionTarget {
  collectionId: string;
  folderId: string | null;
}

export function requestFromRoute(route: SavedRoute, id: string): CustomRequest {
  return {
    id,
    name: route.summary ?? route.path,
    routeId: route.id,
    route,
    draft: null,
    examples: []
  };
}

export function requestsOf(collection: CustomCollection): CustomRequest[] {
  return [...collection.requests, ...collection.folders.flatMap((folder) => folder.requests)];
}

export function requestCount(collections: CustomCollection[]): number {
  return collections.reduce((total, collection) => total + requestsOf(collection).length, 0);
}

export function heldRouteIds(requests: CustomRequest[]): ReadonlySet<string> {
  const held = new Set<string>();

  for (const request of requests) {
    if (request.routeId) held.add(request.routeId);
  }

  return held;
}

export function findRequest(
  collections: CustomCollection[],
  requestId: string
): CustomRequest | null {
  for (const collection of collections) {
    const found = requestsOf(collection).find((request) => request.id === requestId);

    if (found) return found;
  }

  return null;
}

export function requestsAt(
  collections: CustomCollection[],
  target: CollectionTarget
): CustomRequest[] {
  const collection = collections.find((entry) => entry.id === target.collectionId);

  if (!collection) return [];
  if (!target.folderId) return collection.requests;

  return collection.folders.find((folder) => folder.id === target.folderId)?.requests ?? [];
}

export function mapRequests(
  collections: CustomCollection[],
  change: (requests: CustomRequest[]) => CustomRequest[]
): CustomCollection[] {
  return collections.map((collection) => ({
    ...collection,
    requests: change(collection.requests),
    folders: collection.folders.map((folder) => ({
      ...folder,
      requests: change(folder.requests)
    }))
  }));
}

export function addRequestsTo(
  collections: CustomCollection[],
  target: CollectionTarget,
  requests: CustomRequest[]
): CustomCollection[] {
  return collections.map((collection) => {
    if (collection.id !== target.collectionId) return collection;

    if (!target.folderId) {
      return { ...collection, requests: [...collection.requests, ...requests] };
    }

    return {
      ...collection,
      folders: collection.folders.map((folder) =>
        folder.id === target.folderId
          ? { ...folder, requests: [...folder.requests, ...requests] }
          : folder
      )
    };
  });
}

export function withCollection(
  collections: CustomCollection[],
  collectionId: string,
  change: (collection: CustomCollection) => CustomCollection
): CustomCollection[] {
  return collections.map((collection) =>
    collection.id === collectionId ? change(collection) : collection
  );
}

export function withFolder(
  collection: CustomCollection,
  folderId: string,
  change: (folder: CustomFolder) => CustomFolder
): CustomCollection {
  return {
    ...collection,
    folders: collection.folders.map((folder) =>
      folder.id === folderId ? change(folder) : folder
    )
  };
}

export interface DragNode {
  kind: "collection" | "folder" | "request";
  id: string;
}

function movedWithin<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  const [carried] = next.splice(fromIndex, 1);

  next.splice(toIndex, 0, carried);

  return next;
}

function folderHolding(collections: CustomCollection[], folderId: string) {
  return collections.find((collection) =>
    collection.folders.some((folder) => folder.id === folderId)
  );
}

function requestHolding(collections: CustomCollection[], requestId: string) {
  for (const collection of collections) {
    if (collection.requests.some((request) => request.id === requestId)) {
      return { collection, folder: null };
    }

    const folder = collection.folders.find((entry) =>
      entry.requests.some((request) => request.id === requestId)
    );

    if (folder) return { collection, folder };
  }

  return null;
}

function withRequests(
  collections: CustomCollection[],
  target: CollectionTarget,
  change: (requests: CustomRequest[]) => CustomRequest[]
): CustomCollection[] {
  return collections.map((collection) => {
    if (collection.id !== target.collectionId) return collection;

    if (!target.folderId) return { ...collection, requests: change(collection.requests) };

    return {
      ...collection,
      folders: collection.folders.map((folder) =>
        folder.id === target.folderId ? { ...folder, requests: change(folder.requests) } : folder
      )
    };
  });
}

function movedRequest(
  collections: CustomCollection[],
  requestId: string,
  target: CollectionTarget,
  beforeRequestId: string | null
): CustomCollection[] {
  const held = requestHolding(collections, requestId);
  const carried = held
    ? [...held.collection.requests, ...held.collection.folders.flatMap((folder) => folder.requests)]
        .find((request) => request.id === requestId)
    : null;

  if (!carried) return collections;

  const without = mapRequests(collections, (requests) =>
    requests.filter((request) => request.id !== requestId)
  );

  return withRequests(without, target, (requests) => {
    const at = beforeRequestId
      ? requests.findIndex((request) => request.id === beforeRequestId)
      : -1;

    if (at === -1) return [...requests, carried];

    return [...requests.slice(0, at), carried, ...requests.slice(at)];
  });
}

function movedFolder(
  collections: CustomCollection[],
  folderId: string,
  toCollectionId: string,
  beforeFolderId: string | null
): CustomCollection[] {
  const from = folderHolding(collections, folderId);
  const carried = from?.folders.find((folder) => folder.id === folderId);

  if (!from || !carried) return collections;

  if (from.id === toCollectionId && beforeFolderId) {
    const fromIndex = from.folders.findIndex((folder) => folder.id === folderId);
    const toIndex = from.folders.findIndex((folder) => folder.id === beforeFolderId);

    if (fromIndex === -1 || toIndex === -1) return collections;

    return withCollection(collections, from.id, (collection) => ({
      ...collection,
      folders: movedWithin(collection.folders, fromIndex, toIndex)
    }));
  }

  return collections.map((collection) => {
    if (collection.id === from.id) {
      return {
        ...collection,
        folders: collection.folders.filter((folder) => folder.id !== folderId)
      };
    }

    if (collection.id !== toCollectionId) return collection;

    return { ...collection, folders: [...collection.folders, carried] };
  });
}

/** Same kinds reorder; a request or folder dropped on a container joins it. */
export function movedNode(
  collections: CustomCollection[],
  dragged: DragNode,
  target: DragNode
): CustomCollection[] {
  if (dragged.id === target.id) return collections;

  if (dragged.kind === "collection" && target.kind === "collection") {
    const fromIndex = collections.findIndex((collection) => collection.id === dragged.id);
    const toIndex = collections.findIndex((collection) => collection.id === target.id);

    if (fromIndex === -1 || toIndex === -1) return collections;

    return movedWithin(collections, fromIndex, toIndex);
  }

  if (dragged.kind === "folder") {
    if (target.kind === "folder") {
      const into = folderHolding(collections, target.id);

      return into ? movedFolder(collections, dragged.id, into.id, target.id) : collections;
    }

    if (target.kind === "collection") return movedFolder(collections, dragged.id, target.id, null);
  }

  if (dragged.kind === "request") {
    if (target.kind === "request") {
      const into = requestHolding(collections, target.id);

      return into
        ? movedRequest(
            collections,
            dragged.id,
            { collectionId: into.collection.id, folderId: into.folder?.id ?? null },
            target.id
          )
        : collections;
    }

    if (target.kind === "folder") {
      const into = folderHolding(collections, target.id);

      return into
        ? movedRequest(collections, dragged.id, { collectionId: into.id, folderId: target.id }, null)
        : collections;
    }

    if (target.kind === "collection") {
      return movedRequest(collections, dragged.id, { collectionId: target.id, folderId: null }, null);
    }
  }

  return collections;
}
