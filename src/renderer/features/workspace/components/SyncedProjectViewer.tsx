import { GitStatusPane } from "@renderer/features/workspace/components/GitStatusPane";
import { ProjectInfoStrip } from "@renderer/features/workspace/components/ProjectInfoStrip";
import { SyncedProjectTreePanel } from "@renderer/shared/ui/project-tree/adapters/synced-project/SyncedProjectTreePanel";
import type { ImportedProjectIndexResult } from "@renderer/shared/types/lazify";

interface SyncedProjectViewerProps {
  allowGitStatus?: boolean;
  busy: boolean;
  editable?: boolean;
  project: ImportedProjectIndexResult;
}

export function SyncedProjectViewer(props: SyncedProjectViewerProps) {
  return (
    <SyncedProjectTreePanel
      {...props}
      renderGitInfo={({ gitStatus, loading }) => (
        <ProjectInfoStrip gitStatus={gitStatus} loading={loading} />
      )}
      renderGitPane={({ busy, gitStatus, loading, selectedPath, onSelect }) => (
        <GitStatusPane
          busy={busy}
          gitStatus={gitStatus}
          loading={loading}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      )}
    />
  );
}
