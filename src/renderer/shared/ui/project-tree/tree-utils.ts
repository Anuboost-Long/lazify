import type { ProjectTreeNode as TreeNode } from "@renderer/shared/types/lazify";

export function slug(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function toComponentName(name: string) {
  const baseName = name.replace(/\.[^.]+$/, "");
  const cleaned = baseName.replace(/[^a-zA-Z0-9]+/g, " ").trim();

  if (!cleaned) {
    return "Component";
  }

  return cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}


export function createNode(
  name: string,
  type: "file" | "folder",
  source: TreeNode["source"],
  locked: boolean,
  children: TreeNode[] = [],
  seed?: string,
  content?: string
): TreeNode {
  return {
    id: seed ?? `${source}-${type}-${slug(name)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    type,
    source,
    locked,
    content,
    children
  };
}



export function mergeTrees(baseline: TreeNode[], existing: TreeNode[]) {
  const merged: TreeNode[] = baseline.map((node): TreeNode => {
    const match = existing.find(
      (candidate) =>
        candidate.name === node.name && candidate.type === node.type && candidate.source !== "custom"
    );

    if (!match || node.type === "file") {
      return node;
    }

    const mergedChildren = mergeTrees(node.children, match.children);

    return {
      ...node,
      children: mergedChildren
    };
  });

  const mergedIds = new Set(merged.map((node) => node.id));
  const customNodes: TreeNode[] = existing.filter(
    (node): node is TreeNode => {
      if (node.source !== "custom" || mergedIds.has(node.id)) {
        return false;
      }

      mergedIds.add(node.id);
      return true;
    }
  );

  return [...merged, ...customNodes];
}

export function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const nested = findNode(node.children, id);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function updateTree(nodes: TreeNode[], id: string, updater: (node: TreeNode) => TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) {
      return updater(node);
    }

    if (node.children.length === 0) {
      return node;
    }

    return {
      ...node,
      children: updateTree(node.children, id, updater)
    };
  });
}

export function removeFromTree(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeFromTree(node.children, id)
    }));
}

export function addChildNode(nodes: TreeNode[], parentId: string | null, child: TreeNode): TreeNode[] {
  if (parentId === null) {
    return [...nodes, child];
  }

  return updateTree(nodes, parentId, (node) => ({
    ...node,
    children: [...node.children, child]
  }));
}

export function findContainingFolderId(
  nodes: TreeNode[],
  targetId: string,
  parentFolderId: string | null = null
): string | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node.type === "folder" ? node.id : parentFolderId;
    }

    if (node.children.length > 0) {
      const nested = findContainingFolderId(
        node.children,
        targetId,
        node.type === "folder" ? node.id : parentFolderId
      );

      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
}

export function getNodePath(nodes: TreeNode[], id: string, parentPath = ""): string | null {
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    if (node.id === id) {
      return currentPath;
    }

    const nested = getNodePath(node.children, id, currentPath);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function collectFolderIds(nodes: TreeNode[]) {
  const ids: string[] = [];

  for (const node of nodes) {
    if (node.type === "folder") {
      ids.push(node.id);
      ids.push(...collectFolderIds(node.children));
    }
  }

  return ids;
}

export function findFirstFileId(nodes: TreeNode[]): string | null {
  for (const node of nodes) {
    if (node.type === "file") {
      return node.id;
    }

    const nested = findFirstFileId(node.children);

    if (nested) {
      return nested;
    }
  }

  return null;
}

export function countNodes(nodes: TreeNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
}
