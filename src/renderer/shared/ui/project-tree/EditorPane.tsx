import { translation } from "@renderer/i18n/translation";
import { CodeSurface } from "@renderer/shared/ui/code/CodeSurface";
import { EditorPaneNotice, EditorPaneShell } from "@renderer/shared/ui/code/EditorPaneShell";
import type { TreeNode } from "@renderer/shared/ui/project-tree/types";
import { useTranslation } from "react-i18next";

interface EditorPaneProps {
  selectedNode: TreeNode | null;
  selectedPath: string | null;
  onContentChange: (value: string) => void;
  showModuleSelectionToggle?: boolean;
  onOpenModules?: () => void;
}

/** The editable pane: a file being authored, with the modules shortcut. */
export function EditorPane({
  selectedNode,
  selectedPath,
  onContentChange,
  showModuleSelectionToggle = false,
  onOpenModules,
}: Readonly<EditorPaneProps>) {
  const { t } = useTranslation();
  const isFile = selectedNode?.type === "file";

  return (
    <EditorPaneShell
      icon="package"
      title={isFile ? selectedNode.name : t(translation.ProjectTree.NoFileSelected)}
      subtitle={selectedPath ?? t(translation.ProjectTree.SelectFileFromExplorer)}
      badge={isFile ? t(translation.ProjectTree.Editable) : t(translation.ProjectTree.Folder)}
      headerAction={
        showModuleSelectionToggle && onOpenModules ? (
          <button
            type="button"
            onClick={onOpenModules}
            className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent transition-colors hover:border-accent/50 hover:bg-accent/20"
          >
            {t(translation.ProjectTree.Modules)}
          </button>
        ) : null
      }
    >
      {isFile ? (
        <CodeSurface
          content={selectedNode.content ?? ""}
          fileName={selectedNode.name}
          onContentChange={onContentChange}
          placeholder={t(translation.ProjectTree.FileContentPlaceholder)}
        />
      ) : (
        <EditorPaneNotice
          title={t(translation.ProjectTree.SelectFileToEdit)}
          description={t(translation.ProjectTree.SelectFileToEditDesc)}
        />
      )}
    </EditorPaneShell>
  );
}
