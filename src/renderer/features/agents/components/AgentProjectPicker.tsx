import clsx from "clsx";
import { memo, useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { translation } from "@renderer/i18n/translation";
import { formatStackLabel } from "@renderer/features/workspace/utils/stack-label";
import { getTechIconName } from "@renderer/shared/lib/icon-map";
import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import { CaptionText, CardTitle, OverlineText, PillText, SmallText } from "@renderer/shared/typography";
import { IconButton } from "@renderer/shared/ui/IconButton";
import { CardShapes } from "@renderer/shared/ui/card/CardShapes";
import { SheetStack } from "@renderer/shared/ui/card/SheetStack";
import DevIcon from "@renderer/shared/ui/icons/DevIcon";
import UiIcon from "@renderer/shared/ui/icons/UiIcon";

/**
 * Project rail for the agents page.
 *
 * A vertical list that scrolls on its own, so browsing projects never moves the
 * terminal beside it. Cards follow the playful-doc-console direction: document
 * artwork, a status pill, and an action affordance.
 *
 * It collapses to plain names, for when the terminal and preview want the room.
 */

/** localStorage key holding whether the rail is collapsed. */
const COLLAPSED_KEY = "lazify-projects-collapsed";

interface AgentProjectCardProps {
  project: SyncedWorkspaceProject;
  /** Position in the rail — drives the artwork variant and the stagger. */
  index: number;
  active: boolean;
  running: number;
  waiting: number;
  isDragging: boolean;
  isDropTarget: boolean;
  /** Whether the insertion line belongs on the bottom edge. */
  dropsBelow: boolean;
  /** Strips the card down to its name, for the collapsed rail. */
  collapsed: boolean;
  onSelect: (projectPath: string) => void;
  onDragStart: (projectPath: string) => void;
  /** Returns true when the pointer carries one of our cards, not a file. */
  onDragOver: (projectPath: string) => boolean;
  onDragLeave: (projectPath: string) => void;
  onDrop: (projectPath: string) => void;
  onDragEnd: () => void;
}

/**
 * One project in the rail.
 *
 * Memoised, and given resolved values rather than the count maps, because the
 * agents page re-renders on every chunk of terminal output — without this the
 * whole rail would repaint behind a chatting agent. Every callback it takes is
 * stable and identified by project path, so a drag re-renders only the card
 * being dragged and the one under the pointer.
 */
const AgentProjectCard = memo(function AgentProjectCard({
  project,
  index,
  active,
  running,
  waiting,
  isDragging,
  isDropTarget,
  dropsBelow,
  collapsed,
  onSelect,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}: Readonly<AgentProjectCardProps>) {
  const { t } = useTranslation();

  // Shared by both shapes, so reordering behaves identically collapsed or not.
  const dragProps = {
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      onDragStart(project.projectPath);
      event.dataTransfer.effectAllowed = "move";
      // Firefox refuses to start a drag without payload.
      event.dataTransfer.setData("text/plain", project.projectPath);
    },
    onDragOver: (event: React.DragEvent) => {
      if (!onDragOver(project.projectPath)) return;
      // Preventing the default is what marks this a valid drop target.
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onDragLeave: () => onDragLeave(project.projectPath),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      onDrop(project.projectPath);
    },
    onDragEnd
  };

  const dropLine = isDropTarget ? (
    <span
      aria-hidden
      className={clsx(
        "absolute inset-x-2 z-10 h-0.5 rounded-full bg-accent",
        dropsBelow ? "bottom-0" : "top-0"
      )}
    />
  ) : null;

  if (collapsed) {
    return (
      <button
        type="button"
        {...dragProps}
        onClick={() => onSelect(project.projectPath)}
        title={project.projectPath}
        className={clsx(
          "relative flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left",
          "transition-colors cursor-grab active:cursor-grabbing",
          isDragging && "opacity-40",
          active ? "bg-text/[0.10]" : "hover:bg-text/[0.06]"
        )}
      >
        {dropLine}

        {/* The card's whole status story, reduced to one dot: selected, has
            terminals running, or neither. */}
        <span
          aria-hidden
          className={clsx(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            active ? "bg-accent" : running > 0 ? "bg-accent/40" : "bg-border"
          )}
        />

        <SmallText className="!text-text min-w-0 flex-1 truncate">
          {project.projectName}
        </SmallText>

        {/* An agent still needs an answer even when the rail is out of the way. */}
        {waiting > 0 ? (
          <span
            aria-label={t(translation.Agents.NeedsAttention)}
            className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent"
          />
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      {...dragProps}
      onClick={() => onSelect(project.projectPath)}
      style={{ animationDelay: `${index * 45}ms` }}
      className={clsx(
        "group animate-fadeIn relative flex w-full flex-col gap-2.5 overflow-hidden",
        "rounded-[20px] border p-3 text-left",
        "transition-[transform,box-shadow,border-color] duration-300",
        "hover:-translate-y-1 hover:shadow-panel active:scale-[0.98]",
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        active
          ? "border-accent bg-bg shadow-panel"
          : "border-border bg-bg/80 hover:border-accent/40"
      )}
    >
      {/* Inside the card's bounds — it clips its own artwork, so an outset
          line would be cut off. */}
      {dropLine}

      <CardShapes variant={(index % 3) as 0 | 1 | 2} />

      <div className="relative flex items-start gap-2.5">
        <SheetStack active={active} icon={<DevIcon name={getTechIconName(project.stack)} />} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <CardTitle className="min-w-0 flex-1 truncate text-sm">
              {project.projectName}
            </CardTitle>

            {/* An agent is blocked on this project — a small bell where the
                user is choosing which project to look at. */}
            {waiting > 0 ? (
              <span
                title={t(translation.Agents.NeedsAttention)}
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                  "animate-pulse border-accent/40 bg-accent/15 text-accent"
                )}
              >
                <UiIcon name="bell" className="h-3 w-3" />
              </span>
            ) : null}
          </div>
          {/* Paths have no spaces, so break anywhere; two lines, then ellipsis. */}
          <CaptionText
            tone="muted"
            className="mt-0.5 line-clamp-2 !text-[10px] leading-[14px] break-all"
          >
            {project.projectPath}
          </CaptionText>
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PillText
            as="span"
            className={clsx(
              "shrink-0 rounded-full border px-2 py-0.5",
              active
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-border bg-soft text-muted"
            )}
          >
            {formatStackLabel(project.stack)}
          </PillText>

          <CaptionText tone="muted" className="truncate">
            {running > 0
              ? `${running} ${t(translation.Agents.Running)}`
              : t(translation.Agents.Idle)}
          </CaptionText>
        </div>

        <span
          className={clsx(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
            "transition-transform duration-300 group-hover:translate-x-0.5",
            active ? "border-accent/50 text-accent" : "border-border text-muted"
          )}
        >
          <UiIcon name="arrow-right" className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
});

interface AgentProjectPickerProps {
  projects: SyncedWorkspaceProject[];
  selectedPath: string;
  /** Open terminals per project path, shown as card status. */
  runningCounts: Record<string, number>;
  /** Agents waiting on a reply, per project path. Drives the attention badge. */
  waitingCounts: Record<string, number>;
  onSelect: (projectPath: string) => void;
  /** Moves the dragged project to the target project's position. */
  onReorder: (fromProjectPath: string, toProjectPath: string) => void;
  syncing: boolean;
  onSync: () => void;
}

export function AgentProjectPicker({
  projects,
  selectedPath,
  runningCounts,
  waitingCounts,
  onSelect,
  onReorder,
  syncing,
  onSync,
}: Readonly<AgentProjectPickerProps>) {
  const { t } = useTranslation();
  // Card being dragged, and the one it would drop onto.
  const [draggingPath, setDraggingPath] = useState<string | null>(null);
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null);
  // Mirrors the dragged path so the handlers below can stay referentially
  // stable — reading it from state would rebuild them on every drag, and the
  // memoised cards would re-render as a set.
  const draggingPathRef = useRef<string | null>(null);

  const handleDragStart = useCallback((projectPath: string) => {
    draggingPathRef.current = projectPath;
    setDraggingPath(projectPath);
  }, []);

  const handleDragOver = useCallback((projectPath: string) => {
    // Nothing of ours in flight: leave the event alone so a file dragged in
    // from Finder is not offered a drop it cannot make.
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
        {/* The heading is the first thing to go — the toggle has to stay. */}
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

      {/* Only this rail scrolls — the terminal beside it stays put. */}
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
              isDragging={isDragging}
              isDropTarget={isDropTarget}
              // Only ever true for the card actually showing the line, so
              // starting a drag does not flip this for everything below it.
              dropsBelow={isDropTarget && draggingIndex !== -1 && draggingIndex < index}
              collapsed={collapsed}
              onSelect={onSelect}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={endDrag}
            />
          );
        })}
      </div>

      {/* Pinned below the list, so syncing another project never means leaving
          the agents page. Dashed to read as an "add" slot, not a project. */}
      <div className={clsx("shrink-0 border-t border-border", collapsed ? "p-2" : "p-3")}>
        <button
          type="button"
          disabled={syncing}
          onClick={onSync}
          title={collapsed ? t(translation.Workspace.SyncProject) : undefined}
          className={clsx(
            "group/add flex w-full items-center rounded-[18px] text-left",
            "border border-dashed border-border bg-bg/60",
            "transition-[transform,box-shadow,border-color,background-color] duration-300",
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

          {/* Collapsed, the dashed plus says it on its own. */}
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
      </div>
    </aside>
  );
}
