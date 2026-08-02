import { describe, expect, it } from "vitest";

import {
  collectRemovedPaths,
  toEditableTree
} from "../../src/renderer/features/init/lib/prepared-project-tree";
import type {
  ImportedProjectIndexNode,
  ProjectTreeNode
} from "../../src/renderer/shared/types/lazify";

function indexNode(
  name: string,
  relativePath: string,
  children: ImportedProjectIndexNode[] = []
): ImportedProjectIndexNode {
  return {
    id: relativePath,
    name,
    type: children.length > 0 ? "folder" : "file",
    relativePath,
    absolutePath: `/tmp/project/${relativePath}`,
    children
  };
}

function editedNode(name: string, children: ProjectTreeNode[] = []): ProjectTreeNode {
  return {
    id: name,
    name,
    type: children.length > 0 ? "folder" : "file",
    source: "cli",
    locked: false,
    children
  };
}

const diskTree = [
  indexNode("package.json", "package.json"),
  indexNode("README.md", "README.md"),
  indexNode("src", "src", [
    indexNode("app", "src/app", [indexNode("page.tsx", "src/app/page.tsx")]),
    indexNode("utils.ts", "src/utils.ts")
  ])
];

describe("toEditableTree", () => {
  it("locks the files a starter cannot build without", () => {
    const [packageJson, readme] = toEditableTree(diskTree, ["package.json"]);

    expect(packageJson.locked).toBe(true);
    expect(readme.locked).toBe(false);
  });

  it("keeps the shape of the tree on disk", () => {
    const tree = toEditableTree(diskTree, []);

    expect(tree.map((node) => node.name)).toEqual(["package.json", "README.md", "src"]);
    expect(tree[2].children.map((node) => node.name)).toEqual(["app", "utils.ts"]);
  });
});

describe("collectRemovedPaths", () => {
  it("finds nothing when the user changed nothing", () => {
    expect(collectRemovedPaths(diskTree, toEditableTree(diskTree, []))).toEqual([]);
  });

  it("reports a file the user took out", () => {
    const edited = toEditableTree(diskTree, []).filter((node) => node.name !== "README.md");

    expect(collectRemovedPaths(diskTree, edited)).toEqual(["README.md"]);
  });

  it("reports a nested file by its full path", () => {
    const edited = [
      editedNode("package.json"),
      editedNode("README.md"),
      editedNode("src", [editedNode("app", []), editedNode("utils.ts")])
    ];

    // src/app survives as an empty folder, so only its child went.
    expect(collectRemovedPaths(diskTree, edited)).toEqual(["src/app/page.tsx"]);
  });

  it("reports a removed folder once, not every file inside it", () => {
    const edited = toEditableTree(diskTree, []).filter((node) => node.name !== "src");

    // Deleting the folder already takes its children; listing them too would
    // make the progress count wrong and the request redundant.
    expect(collectRemovedPaths(diskTree, edited)).toEqual(["src"]);
  });
});
