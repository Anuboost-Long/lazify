import { DiffView, type DiffViewMode } from "./DiffView";

interface DiffEditorPanelProps {
  content: string;
  fileName: string;
  mode: DiffViewMode;
  collapseUnchanged?: boolean;
}

export function DiffEditorPanel({
  content,
  fileName,
  mode,
  collapseUnchanged = false,
}: Readonly<DiffEditorPanelProps>) {
  return (
    <DiffView
      diff={content}
      mode={mode}
      fileName={fileName}
      showHunkHeaders={false}
      collapseUnchanged={collapseUnchanged}
    />
  );
}
