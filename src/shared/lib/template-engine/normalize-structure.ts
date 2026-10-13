import { detectFileRole } from "./detect-file-role";
import { detectFolderRole } from "./detect-folder-role";
import type { FileNode, FolderNode, TreeNode } from "./types";

export function normalizeStructure(tree: TreeNode[]): {
  files: FileNode[];
  folders: FolderNode[];
} {
  const files: FileNode[] = [];
  const folders: FolderNode[] = [];

  const visit = (node: TreeNode) => {
    if (node.type === "file") {
      files.push({
        ...node,
        role: node.role ?? detectFileRole(node.path),
      });
      return;
    }

    folders.push({
      id: node.id,
      name: node.name,
      path: node.path,
      type: "folder",
      role: node.role ?? detectFolderRole(node.path),
      locked: node.locked,
      source: node.source,
    });

    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of tree) {
    visit(node);
  }

  return { files, folders };
}
