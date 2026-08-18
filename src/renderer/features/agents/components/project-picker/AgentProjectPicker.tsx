import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BranchSwitcher } from "@renderer/features/workspace/components/BranchSwitcher";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { OverlineText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import { ProjectSyncButton } from "@renderer/shared/ui/project-picker/ProjectSyncButton";
import { AgentProjectCard } from "./AgentProjectCard";

const COLLAPSED_KEY = "lazify-projects-collapsed";

interface AgentProjectPickerProps {
  projects: SyncedWorkspaceProject[];
  selectedPath: string;

  runningCounts: Record<string, number>;

  waitingCounts: Record<string, number>;

  tabCounts: Record<string, number>;
  onSelect: (projectPath: string) => void;

  onCloseProjectTabs: (projectPath: string) => void;

  onReorder: (fromProjectPath: string, toProjectPath: string) => void;
  syncing: boolean;
  onSync: () => void;

  branch: string | null;

  branches: string[];
  repoRoot: string;

  onBranchSwitched: () => void;
}

export function AgentProjectPicker({
  projects,
  selectedPath,
  runningCounts,
  waitingCounts,
  tabCounts,
  onSelect,
  onCloseProjectTabs,
  onReorder,
  syncing,
  onSync,
  branch,
  branches,
  repoRoot,
  onBranchSwitched,
}: Readonly<AgentProjectPickerProps>) {
  const { t } = useTranslation();

  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);

  const draggingPathRef = useRef<string | null>(null);

  const handleDragStart = useCallback((projectPath: string) => {
    draggingPathRef.current = projectPath;
    setDraggingPath(projectPath);
  }, []);

  const handleDragOver = useCallback((projectPath: string) => {
    if (!draggingPathRef.current) return false;
    setDropTargetPath(projectPath);
    return true;
  }, []);

  const handleDragLeave = useCallback((projectPath: string) => {
    setDropTargetPath((current) => (current === projectPath ? null : current));
  }, []);

  const endDrag = useCallback(() => {
    draggingPathRef.current = null;
    setDraggingPath(null);
    setDropTargetPath(null);
  }, []);

  const handleDrop = useCallback(
    (projectPath: string) => {
      const from = draggingPathRef.current;
      if (from) onReorder(from, projectPath);
      endDrag();
    },
    [endDrag, onReorder]
  );

  const [pendingCloseAll, setPendingCloseAll] = useState<string | null>(null);

  const handleCloseAll = useCallback((projectPath: string) => {
    setPendingCloseAll(projectPath);
  }, []);

  const draggingIndex = draggingPath
    ? projects.findIndex((candidate) => candidate.projectPath === draggingPath)
    : -1;

  const [collapsed, setCollapsed] = useState(
    () => globalThis.localStorage.getItem(COLLAPSED_KEY) === "true"
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      globalThis.localStorage.setItem(COLLAPSED_KEY, String(!current));
      return !current;
    });
  }, []);

  return (
    <aside
      className={clsx(
        "flex min-h-0 w-full flex-col rounded-[24px] border border-border bg-soft",
        "transition-[width] duration-300 lg:shrink-0",
        collapsed ? "lg:w-[196px]" : "lg:w-[300px]"
      )}
    >
      <div
        className={clsx(
          "flex shrink-0 items-center gap-1 pb-2 pt-4",
          collapsed ? "px-2" : "px-4"
        )}
      >

        {collapsed ? null : (
          <OverlineText className="min-w-0 flex-1 truncate text-accent">
            {t(translation.Agents.Projects)}
          </OverlineText>
        )}

        <IconButton
          icon={collapsed ? "expand" : "collapse"}
          aria-label={t(
            collapsed
              ? translation.Agents.ExpandProjects
              : translation.Agents.CollapseProjects
          )}
          onClick={toggleCollapsed}
          className={clsx(collapsed && "ml-auto mr-auto")}
        />
      </div>

      <div
        className={clsx(
          "min-h-0 flex-1 overflow-y-auto pb-3",
          collapsed ? "space-y-0.5 px-2" : "space-y-2 px-3"
        )}
      >
        {projects.map((project, index) => {
          const isDragging = project.projectPath === draggingPath;
          const isDropTarget = project.projectPath === dropTargetPath && !isDragging;

          return (
            <AgentProjectCard
              key={project.projectPath}
              project={project}
              index={index}
              active={project.projectPath === selectedPath}
              running={runningCounts[project.projectPath] ?? 0}
              waiting={waitingCounts[project.projectPath] ?? 0}
              tabCount={tabCounts[project.projectPath] ?? 0}
              isDragging={isDragging}
              isDropTarget={isDropTarget}

              dropsBelow={isDropTarget && draggingIndex !== -1 && draggingIndex < index}
              collapsed={collapsed}
              onSelect={onSelect}
              onCloseAll={handleCloseAll}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={endDrag}
            />
          );
        })}
      </div>

      <div className={clsx("shrink-0 border-t border-border", collapsed ? "p-2" : "p-3")}>

        {!collapsed && branches.length > 0 ? (
          <div className="mb-2">
            <BranchSwitcher
              projectPath={selectedPath}
              branch={branch}
              branches={branches}
              repoRoot={repoRoot}
              placement="up"
              onSwitched={onBranchSwitched}
            />
          </div>
        ) : null}

        <ProjectSyncButton syncing={syncing} compact={collapsed} onClick={onSync} />
      </div>

      <ConfirmModal
        open={pendingCloseAll !== null}
        title={t(translation.Agents.CloseProjectTabsTitle)}
        description={t(translation.Agents.CloseProjectTabsDesc, {
          tabs: pendingCloseAll ? tabCounts[pendingCloseAll] ?? 0 : 0,
          project:
            projects.find((project) => project.projectPath === pendingCloseAll)
              ?.projectName ?? ""
        })}
        confirmLabel={t(translation.Agents.CloseProjectTabs)}
        destructive
        onConfirm={() => {
          if (pendingCloseAll) onCloseProjectTabs(pendingCloseAll);
          setPendingCloseAll(null);
        }}
        onCancel={() => setPendingCloseAll(null)}
      />
    </aside>
  );
}
