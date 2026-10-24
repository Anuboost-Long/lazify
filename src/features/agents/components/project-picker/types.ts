import type { ReactNode } from "react";

import type { SyncedWorkspaceProject } from "@/shared/types/lazify";

export interface AgentProjectCardProps {
	project: SyncedWorkspaceProject;

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
	"project" | "active" | "running" | "waiting" | "tabCount" | "isDragging" | "onSelect" | "onCloseAll"
> & {
	dragProps: Record<string, unknown>;
	dropLine: ReactNode;
};
