import { GitInfoModal } from "@/features/workspace/components/GitInfoModal";
import { GitStatusPane } from "@/features/workspace/components/GitStatusPane";
import type { ImportedProjectIndexResult } from "@/shared/types/lazify";
import { SyncedProjectTreePanel } from "@/shared/ui/project-tree/adapters/synced-project/SyncedProjectTreePanel";
import type { SidebarView } from "@/shared/ui/project-tree/sidebar/types";

interface SyncedProjectViewerProps {
  allowGitStatus?: boolean;
  busy: boolean;
  editable?: boolean;
  project: ImportedProjectIndexResult;
  reveal?: { filePath: string; line: number | null } | null;
  toolViews?: SidebarView[];
  onOpenConsole?: () => void;
  onStartAgent?: () => void;
}

export function SyncedProjectViewer(props: Readonly<SyncedProjectViewerProps>) {
  return (
    <SyncedProjectTreePanel
      {...props}
      renderGitInfo={({ gitStatus, loading, open, onClose }) => (
        <GitInfoModal
          open={open}
          onClose={onClose}
          gitStatus={gitStatus}
          loading={loading}
        />
      )}
      renderGitPane={({
        busy,
        gitStatus,
        loading,
        selectedPath,
        onSelect,
        projectPath,
        onBranchSwitched,
      }) => (
        <GitStatusPane
          chrome="flush"
          showHeader={false}
          busy={busy}
          gitStatus={gitStatus}
          loading={loading}
          selectedPath={selectedPath}
          onSelect={onSelect}
          projectPath={projectPath}
          onBranchSwitched={onBranchSwitched}
        />
      )}
    />
  );
}
