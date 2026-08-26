import type { DetectedPackageManager, ProjectStack, StackDetectionResult } from "./project-tree";

export interface SyncedWorkspaceProject {
	id: string;
	projectName: string;
	projectPath: string;
	stack: ProjectStack;
	framework: StackDetectionResult["framework"];
	metaFramework: StackDetectionResult["metaFramework"];
	packageManager: DetectedPackageManager;
	confidence: number;
	lastSyncedAt: string;
	nodeVersion?: string | null;
}

export interface EnvironmentSummary {
	nodeVersion: string;
	npmVersion: string;
	yarnVersion: string;
}

export type WorkflowStatus = "idle" | "running" | "success" | "error";
