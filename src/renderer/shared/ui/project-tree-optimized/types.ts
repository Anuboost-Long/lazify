import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";

export interface OptimizedImportedProjectTreeProps {
  busy: boolean;
  projectName: string;
  projectPath: string;
  tree: ImportedProjectIndexNode[];
}

export interface VisibleRow {
  node: ImportedProjectIndexNode;
  depth: number;
}

export interface FileContentState {
  status: "idle" | "loading" | "loaded" | "error";
  content: string;
}
