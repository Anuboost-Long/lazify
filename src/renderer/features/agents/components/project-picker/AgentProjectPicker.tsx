import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { BranchSwitcher } from "@renderer/features/workspace/components/BranchSwitcher";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CardTitle, OverlineText } from "@renderer/shared/typography";
import { Tooltip } from "@renderer/shared/ui/Tooltip";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { ConfirmModal } from "@renderer/shared/ui/modal/ConfirmModal";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";
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

        <Tooltip content={collapsed ? t(translation.Workspace.SyncProject) : undefined} side="right">
          <button
            type="button"
            disabled={syncing}
            onClick={onSync}
            className={clsx(
              "group/add flex w-full items-center rounded-[18px] text-left",
              "border border-dashed border-border bg-bg/60",
              "transition-[transform,box-shadow] duration-300",
              "hover:-translate-y-0.5 hover:border-accent/50 hover:bg-bg hover:shadow-panel",
              "active:scale-[0.98]",
              "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
              collapsed ? "justify-center p-2" : "gap-2.5 p-3"
            )}
          >
            <span
              className={clsx(
                "flex shrink-0 items-center justify-center rounded-[12px]",
                "border border-border bg-soft text-accent",
                "transition-transform duration-300",
                !syncing && "group-hover/add:rotate-90",
                collapsed ? "h-7 w-7" : "h-9 w-9"
              )}
            >
              <UiIcon
                name={syncing ? "refresh-circle" : "plus"}
                className={clsx("h-4 w-4", syncing && "animate-spin")}
              />
            </span>

            {collapsed ? null : (
              <>
                <CardTitle className="min-w-0 flex-1 truncate text-sm">
                  {t(translation.Workspace.SyncProject)}
                </CardTitle>

                <span
                  className={clsx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    "border-border text-muted transition-transform duration-300",
                    "group-hover/add:translate-x-0.5"
                  )}
                >
                  <UiIcon name="arrow-right" className="h-3 w-3" />
                </span>
              </>
            )}
          </button>
        </Tooltip>
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
