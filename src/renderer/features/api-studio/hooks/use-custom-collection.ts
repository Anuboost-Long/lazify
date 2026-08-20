import { useEffect, useRef, useState } from "react";

import {
  addRequestsTo,
  findRequest,
  mapRequests,
  movedNode,
  requestFromRoute,
  withCollection,
  withFolder,
  type CollectionTarget,
  type CustomCollection,
  type DragNode,
  type CustomRequestDraft
} from "../custom-collection";
import type { SavedExample, SavedRoute } from "../types";

async function detailsFor(projectPath: string, routes: SavedRoute[]): Promise<SavedRoute[]> {
  if (!projectPath) return routes;

  const folders = Array.from(new Set(routes.map((route) => route.folder)));
  const read = await Promise.all(
    folders.map((folder) =>
      globalThis.lazify.readRouteDetails(projectPath, folder).catch(() => [])
    )
  );
  const byId = new Map(read.flat().map((detail) => [detail.id, detail]));

  return routes.map((route) => ({ ...route, ...byId.get(route.id) }));
}

const OPEN_KEY = "lazify-api-studio-open";

function readOpen(projectPath: string): Set<string> {
  try {
    const stored = globalThis.localStorage?.getItem(`${OPEN_KEY}:${projectPath}`);

    return new Set(stored ? (JSON.parse(stored) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useCustomCollection(projectPath: string) {
  const [collections, setCollections] = useState<CustomCollection[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loadedAt, setLoadedAt] = useState(0);
  const current = useRef<CustomCollection[]>([]);
  const nextId = useRef(0);

  const rememberOpen = (next: Set<string>) => {
    setExpanded(next);

    if (!projectPath) return;

    try {
      globalThis.localStorage?.setItem(`${OPEN_KEY}:${projectPath}`, JSON.stringify([...next]));
    } catch {
      return;
    }
  };

  useEffect(() => {
    current.current = [];
    setCollections([]);
    setExpanded(readOpen(projectPath));
    setLoadedAt(0);

    if (!projectPath) return;

    let cancelled = false;

    void globalThis.lazify
      .readApiCollections(projectPath)
      .then((stored) => {
        if (cancelled) return;

        current.current = stored;
        setCollections(stored);
        setLoadedAt(Date.now());
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const apply = (change: (collections: CustomCollection[]) => CustomCollection[]) => {
    const next = change(current.current);

    current.current = next;
    setCollections(next);

    if (projectPath) {
      void globalThis.lazify.saveApiCollections(projectPath, next).catch(() => undefined);
    }
  };

  const idFor = (kind: string) => {
    nextId.current += 1;

    return `${kind}-${Date.now()}-${nextId.current}`;
  };

  return {
    collections,
    expanded,
    loadedAt,
    requestById: (requestId: string) => findRequest(current.current, requestId),
    addCollection: (name: string) => {
      const collection = { id: idFor("collection"), name, folders: [], requests: [] };

      apply((currentCollections) => [...currentCollections, collection]);
      rememberOpen(new Set([...expanded, collection.id]));

      return collection.id;
    },
    renameCollection: (collectionId: string, name: string) =>
      apply((currentCollections) =>
        withCollection(currentCollections, collectionId, (collection) => ({ ...collection, name }))
      ),
    removeCollection: (collectionId: string) =>
      apply((currentCollections) =>
        currentCollections.filter((collection) => collection.id !== collectionId)
      ),
    addFolder: (collectionId: string, name: string) => {
      const folder = { id: idFor("folder"), name, requests: [] };

      rememberOpen(new Set([...expanded, collectionId, folder.id]));
      apply((currentCollections) =>
        withCollection(currentCollections, collectionId, (collection) => ({
          ...collection,
          folders: [...collection.folders, folder]
        }))
      );

      return folder.id;
    },
    renameFolder: (collectionId: string, folderId: string, name: string) =>
      apply((currentCollections) =>
        withCollection(currentCollections, collectionId, (collection) =>
          withFolder(collection, folderId, (folder) => ({ ...folder, name }))
        )
      ),
    removeFolder: (collectionId: string, folderId: string) =>
      apply((currentCollections) =>
        withCollection(currentCollections, collectionId, (collection) => ({
          ...collection,
          folders: collection.folders.filter((folder) => folder.id !== folderId)
        }))
      ),
    addRequests: async (target: CollectionTarget, routes: SavedRoute[]) => {
      const detailed = await detailsFor(projectPath, routes);

      apply((currentCollections) =>
        addRequestsTo(
          currentCollections,
          target,
          detailed.map((route) => requestFromRoute(route, idFor("request")))
        )
      );
    },
    renameRequest: (requestId: string, name: string) =>
      apply((currentCollections) =>
        mapRequests(currentCollections, (requests) =>
          requests.map((request) => (request.id === requestId ? { ...request, name } : request))
        )
      ),
    removeExample: (requestId: string, exampleId: string) =>
      apply((currentCollections) =>
        mapRequests(currentCollections, (requests) =>
          requests.map((request) =>
            request.id === requestId
              ? {
                  ...request,
                  examples: request.examples.filter((example) => example.id !== exampleId)
                }
              : request
          )
        )
      ),
    moveNode: (dragged: DragNode, target: DragNode) =>
      apply((currentCollections) => movedNode(currentCollections, dragged, target)),
    removeRequest: (requestId: string) =>
      apply((currentCollections) =>
        mapRequests(currentCollections, (requests) =>
          requests.filter((request) => request.id !== requestId)
        )
      ),
    saveDraft: (
      requestId: string,
      draft: CustomRequestDraft | null,
      examples?: SavedExample[]
    ) => {
      const held = findRequest(current.current, requestId)?.examples.length ?? 0;

      if (examples && examples.length > held) rememberOpen(new Set([...expanded, requestId]));

      apply((currentCollections) =>
        mapRequests(currentCollections, (requests) =>
          requests.map((request) =>
            request.id === requestId
              ? { ...request, draft, examples: examples ?? request.examples }
              : request
          )
        )
      );
    },
    collapseAll: () => rememberOpen(new Set()),
    toggle: (nodeId: string) => {
      const next = new Set(expanded);

      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);

      rememberOpen(next);
    }
  };
}

export type CustomCollectionApi = ReturnType<typeof useCustomCollection>;
