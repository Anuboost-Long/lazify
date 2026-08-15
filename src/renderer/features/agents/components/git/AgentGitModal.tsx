import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { GitStatusPane } from "@renderer/features/workspace/components/GitStatusPane";
import { translation } from "@renderer/i18n/translation";
import type { GitStatusEntry } from "@renderer/shared/types/lazify";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { BaseModal } from "@renderer/shared/ui/modal/BaseModal";
import { AgentDiffModal } from "../AgentDiffModal";
import { useAgentBranch } from "../../hooks/use-agent-branch";

/**
 * The synced project page's source control view, brought to the agents page as
 * a modal — stage, commit, push and pull without leaving the terminals. It is a
 * modal in both the default layout and the live monitor, because the wall has
 * no room for another rail panel and the work here is a short errand.
 *
 * Selecting a file opens its diff on top, the same modal the changes panel uses.
 */

interface AgentGitModalProps {
  projectPath: string;
  onClose: () => void;
}

export function AgentGitModal({ projectPath, onClose }: Readonly<AgentGitModalProps>) {
  const { t } = useTranslation();
  const { status, loading, refresh } = useAgentBranch(projectPath);
  const [selected, setSelected] = useState<GitStatusEntry | null>(null);

  useEffect(() => setSelected(null), [projectPath]);

  return (
    <>
      <BaseModal open onClose={onClose}>
        <div
          className={clsx(
            "flex h-[80vh] max-h-[calc(100vh-4rem)] w-[30rem] max-w-[calc(100vw-2rem)]",
            "flex-col overflow-hidden rounded-shell border border-border bg-soft shadow-panel"
          )}
        >
          <GitStatusPane
            chrome="flush"
            busy={false}
            gitStatus={status}
            loading={loading}
            selectedPath={selected?.path ?? null}
            onSelect={setSelected}
            projectPath={projectPath}
            onBranchSwitched={refresh}
            headerActions={
              <>
                <IconButton
                  icon="refresh-circle"
                  aria-label={t(translation.GlobalTerm.Refresh)}
                  onClick={refresh}
                  iconClassName={loading ? "animate-spin" : undefined}
                  className="text-text"
                />
                <IconButton
                  icon="xmark"
                  aria-label={t(translation.GlobalTerm.Close)}
                  onClick={onClose}
                  className="text-text"
                />
              </>
            }
          />
        </div>
      </BaseModal>

      {/* Absolute path: the diff is read from the repository root, which is not
          always the project the agent runs in. */}
      <AgentDiffModal
        projectPath={projectPath}
        filePath={selected?.absolutePath ?? null}
        additions={0}
        deletions={0}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
