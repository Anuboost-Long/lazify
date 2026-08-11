import { GitInfoModal } from "@renderer/features/workspace/components/GitInfoModal";
import { GitStatusPane } from "@renderer/features/workspace/components/GitStatusPane";
import type { ImportedProjectIndexResult } from "@renderer/shared/types/lazify";
import { SyncedProjectTreePanel } from "@renderer/shared/ui/project-tree/adapters/synced-project/SyncedProjectTreePanel";
import type { SidebarView } from "@renderer/shared/ui/project-tree/sidebar/types";

interface SyncedProjectViewerProps {
  allowGitStatus?: boolean;
  busy: boolean;
  editable?: boolean;
  project: ImportedProjectIndexResult;
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
