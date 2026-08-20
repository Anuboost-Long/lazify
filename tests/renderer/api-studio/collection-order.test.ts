import { describe, expect, it } from "vitest";

import { movedNode } from "../../../src/renderer/features/api-studio/custom-collection";
import type {
  CustomCollection,
  CustomRequest
} from "../../../src/main/api-studio/custom-collections";

function request(id: string): CustomRequest {
  return {
    id,
    name: id,
    routeId: null,
    route: {
      id,
      folder: "users",
      workspace: "",
      method: "GET",
      path: `/${id}`,
      summary: null,
      operationId: null,
      tags: [],
      servers: [],
      headers: [],
      security: [],
      source: {
        kind: "scanner",
        filePath: null,
        line: null,
        adapter: "aspnet",
        confidence: "exact"
      },
      firstSeenAt: "2026-08-20T09:00:00.000Z"
    },
    draft: null,
    examples: []
  };
}

function tree(): CustomCollection[] {
  return [
    {
      id: "collection-1",
      name: "First",
      folders: [
        { id: "folder-1", name: "Auth", requests: [request("request-1"), request("request-2")] },
        { id: "folder-2", name: "Users", requests: [] }
      ],
      requests: [request("request-3")]
    },
    { id: "collection-2", name: "Second", folders: [], requests: [] }
  ];
}

const namesOf = (collections: CustomCollection[]) =>
  collections.map((collection) => collection.name);

describe("putting a collection tree in the order the user wants", () => {
  it("moves a collection to another's place", () => {
    const moved = movedNode(
      tree(),
      { kind: "collection", id: "collection-2" },
      { kind: "collection", id: "collection-1" }
    );

    expect(namesOf(moved)).toEqual(["Second", "First"]);
  });

  it("reorders folders inside their collection", () => {
    const moved = movedNode(
      tree(),
      { kind: "folder", id: "folder-2" },
      { kind: "folder", id: "folder-1" }
    );

    expect(moved[0].folders.map((folder) => folder.name)).toEqual(["Users", "Auth"]);
  });

  it("reorders requests inside their folder", () => {
    const moved = movedNode(
      tree(),
      { kind: "request", id: "request-2" },
      { kind: "request", id: "request-1" }
    );

    expect(moved[0].folders[0].requests.map((entry) => entry.id)).toEqual([
      "request-2",
      "request-1"
    ]);
  });

  it("carries a request into the folder it was dropped on", () => {
    const moved = movedNode(
      tree(),
      { kind: "request", id: "request-3" },
      { kind: "folder", id: "folder-2" }
    );

    expect(moved[0].requests).toEqual([]);
    expect(moved[0].folders[1].requests.map((entry) => entry.id)).toEqual(["request-3"]);
  });

  it("carries a request out of a folder onto the collection itself", () => {
    const moved = movedNode(
      tree(),
      { kind: "request", id: "request-1" },
      { kind: "collection", id: "collection-2" }
    );

    expect(moved[0].folders[0].requests.map((entry) => entry.id)).toEqual(["request-2"]);
    expect(moved[1].requests.map((entry) => entry.id)).toEqual(["request-1"]);
  });

  it("carries a folder into another collection", () => {
    const moved = movedNode(
      tree(),
      { kind: "folder", id: "folder-1" },
      { kind: "collection", id: "collection-2" }
    );

    expect(moved[0].folders.map((folder) => folder.id)).toEqual(["folder-2"]);
    expect(moved[1].folders.map((folder) => folder.id)).toEqual(["folder-1"]);
    expect(moved[1].folders[0].requests).toHaveLength(2);
  });

  it("leaves the tree alone when a node is dropped on itself or on nothing it knows", () => {
    expect(
      movedNode(tree(), { kind: "request", id: "request-1" }, { kind: "request", id: "request-1" })
    ).toEqual(tree());
    expect(
      movedNode(tree(), { kind: "folder", id: "folder-9" }, { kind: "folder", id: "folder-1" })
    ).toEqual(tree());
  });
});
