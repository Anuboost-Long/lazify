import type { SyncedWorkspaceProject } from "@renderer/shared/types/lazify";
import type { ReactNode } from "react";

export interface AgentProjectCardProps {
  project: SyncedWorkspaceProject;

  index: number;
  active: boolean;
  running: number;
  waiting: number;

  tabCount: number;
  isDragging: boolean;
  isDropTarget: boolean;

  dropsBelow: boolean;

  collapsed: boolean;
  onSelect: (projectPath: string) => void;

  onCloseAll: (projectPath: string) => void;
  onDragStart: (projectPath: string) => void;

  onDragOver: (projectPath: string) => boolean;
  onDragLeave: (projectPath: string) => void;
  onDrop: (projectPath: string) => void;
  onDragEnd: () => void;
}

export type CardShellProps = Pick<
  AgentProjectCardProps,
  | "project"
  | "index"
  | "active"
  | "running"
  | "waiting"
  | "tabCount"
  | "isDragging"
  | "onSelect"
  | "onCloseAll"
> & {
  dragProps: Record<string, unknown>;
  dropLine: ReactNode;
};
