import type {
  ProjectTreeNode
} from "@renderer/shared/types/lazify";

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
  layout?: "card" | "workbench";
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
