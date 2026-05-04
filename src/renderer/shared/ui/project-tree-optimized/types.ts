import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";

export interface OptimizedImportedProjectTreeProps {
  busy: boolean;
  editable?: boolean;
  onSaveTemplate: (
    includedRelativePaths: string[],
    providedName: string,
    confirmedStack: string
  ) => Promise<void>;
  projectName: string;
  projectPath: string;
  tree: ImportedProjectIndexNode[];
  initialConfirmedStack?: string;
}

export interface VisibleRow {
  node: ImportedProjectIndexNode;
  depth: number;
}

export interface FileContentState {
  status: "idle" | "loading" | "loaded" | "error";
  content: string;
}

export interface TreeContextMenuState {
  node: ImportedProjectIndexNode;
  x: number;
  y: number;
}
