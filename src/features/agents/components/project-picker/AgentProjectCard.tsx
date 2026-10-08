import clsx from "clsx";
import { memo } from "react";

import { ProjectCardCollapsed } from "./ProjectCardCollapsed";
import { ProjectCardExpanded } from "./ProjectCardExpanded";
import type { AgentProjectCardProps } from "./types";

export const AgentProjectCard = memo(function AgentProjectCard({
  project,
  index,
  active,
  running,
  waiting,
  tabCount,
  isDragging,
  isDropTarget,
  dropsBelow,
  collapsed,
  onSelect,
  onCloseAll,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: Readonly<AgentProjectCardProps>) {
  const dragProps = {
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      onDragStart(project.projectPath);
      event.dataTransfer.effectAllowed = "move";

      event.dataTransfer.setData("text/plain", project.projectPath);
    },
    onDragOver: (event: React.DragEvent) => {
      if (!onDragOver(project.projectPath)) return;

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

  const shell = {
    project,
    index,
    active,
    running,
    waiting,
    tabCount,
    isDragging,
    onSelect,
    onCloseAll,
    dragProps,
    dropLine,
  };

  return collapsed ? (
    <ProjectCardCollapsed {...shell} />
  ) : (
    <ProjectCardExpanded {...shell} />
  );
});
