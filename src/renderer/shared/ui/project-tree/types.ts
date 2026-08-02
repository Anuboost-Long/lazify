import type {
  ImportedTemplateSnapshot,
  ProjectTreeNode,
  SavedInitWorkflowConfig,
  TemplateOption
} from "@renderer/shared/types/lazify";

export interface FileStructureSetupPanelProps {
  busy: boolean;
  importedTemplate: ImportedTemplateSnapshot | null;
  /**
   * A stack project's real tree, already written to disk. When it is present
   * nothing is synthesized: the editor shows the files that actually exist.
   */
  preparedTree: TreeNode[] | null;
  /** Optional folders the starter offers; empty when it declares none. */
  preparedOptionalFolders: { path: string; label: string }[];
  savedConfig: SavedInitWorkflowConfig;
  selectedStructurePaths: string[];
  templateOptions: TemplateOption[];
  onBackToConfig: () => void;
  onCreateProject: () => void;
  onTreeChange: (tree: TreeNode[]) => void;
  onToggleStructurePath: (path: string) => void;
}

export interface ProjectTreeEditorPanelProps {
  busy: boolean;
  eyebrow: string;
  title: string;
  description: string;
  projectName: string;
  templateId: string;
  templateLabel: string;
  selectedStructurePaths: string[];
  initialTree?: TreeNode[] | null;
  replaceTreeOnInitialChange?: boolean;
  showModuleSelectionToggle?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onTreeChange: (tree: TreeNode[]) => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  moduleSheet?: {
    options: { path: string; label: string; description?: string }[];
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    onToggleStructurePath: (path: string) => void;
  };
}

export type TreeNode = ProjectTreeNode;

