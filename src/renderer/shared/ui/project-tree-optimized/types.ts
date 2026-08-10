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
  /** File text, or base64 bytes when `mimeType` says this is an asset. */
  content: string;
  /** Set only for files the editor renders — images and PDFs. */
  mimeType?: string;
  byteLength?: number;
}

export interface TreeContextMenuState {
  node: ImportedProjectIndexNode;
  x: number;
  y: number;
}
