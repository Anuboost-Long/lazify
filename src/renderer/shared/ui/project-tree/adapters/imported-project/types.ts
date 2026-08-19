import type { ImportedProjectIndexNode } from "@renderer/shared/types/lazify";

export interface ImportedProjectTreePanelProps {
  busy: boolean;
  editable?: boolean;
  onSaveTemplate: (
    includedRelativePaths: string[],
    providedName: string,
    confirmedStack: string,
  ) => Promise<void>;
  projectName: string;
  projectPath: string;
  tree: ImportedProjectIndexNode[];
  initialConfirmedStack?: string;
}
