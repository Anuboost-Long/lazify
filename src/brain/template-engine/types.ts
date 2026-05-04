import type { StackDetectionResult } from "../stack-detection/types";

export type FileRole =
  | "entry-point"
  | "config"
  | "api"
  | "ui"
  | "hook"
  | "type"
  | "asset"
  | "style"
  | "state"
  | "navigation"
  | "service"
  | "unknown";

export type FolderRole =
  | "ui-layer"
  | "data-layer"
  | "shared-ui"
  | "static"
  | "types"
  | "navigation"
  | "state"
  | "services"
  | "config"
  | "unknown";

export type TemplateNodeSource = "imported" | "custom" | "generated";

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file";
  extension: string;
  size?: number;
  role?: FileRole;
  includeContent: boolean;
  content?: string;
  isBinary: boolean;
  locked?: boolean;
  source?: TemplateNodeSource;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  type: "folder";
  role?: FolderRole;
  locked?: boolean;
  source?: TemplateNodeSource;
}

export type TreeNode = FileNode | (FolderNode & { children: TreeNode[] });

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  sourceProjectPath?: string;
  stackDetection: StackDetectionResult;
  structure: {
    files: FileNode[];
    folders: FolderNode[];
    tree?: TreeNode[];
  };
  features: string[];
  tags: string[];
  metadata: {
    createdAt: string;
    updatedAt?: string;
    fileCount: number;
    folderCount: number;
    selectedItemCount: number;
    originalFileCount?: number;
  };
}
