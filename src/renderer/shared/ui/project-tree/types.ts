import type {
  ImportedTemplateSnapshot,
  ProjectTreeNode,
  SavedInitWorkflowConfig,
  TemplateOption
} from "@renderer/shared/types/lazify";

export interface FileStructureSetupPanelProps {
  busy: boolean;
  importedTemplate: ImportedTemplateSnapshot | null;
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
  useScaffoldBaseline?: boolean;
  replaceTreeOnInitialChange?: boolean;
  showModuleSelectionToggle?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onTreeChange: (tree: TreeNode[]) => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  moduleSheet?: {
    open: boolean;
    onOpen: () => void;
    onClose: () => void;
    onToggleStructurePath: (path: string) => void;
  };
}

export type TreeNode = ProjectTreeNode;

export interface StructureOption {
  path: string;
  label: string;
  description: string;
  files: string[];
}

export interface TemplateBlueprintEntry {
  name: string;
  type: "file" | "folder";
  children?: TemplateBlueprintEntry[];
}

export interface TemplateBlueprint {
  rootFiles: string[];
  folders: TemplateBlueprintEntry[];
}
