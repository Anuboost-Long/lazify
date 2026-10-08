import type {
	FileRole,
	FolderRole,
	ProjectStack,
	ProjectTreeNode,
	StackDetectionResult,
} from "./project-tree";

export interface TemplateCreateOption {
	key: string;
	label: string;
	default: boolean;
	onFlag: string;
	offFlag: string;
}

export interface TemplateOption {
	id: string;
	label: string;
	description: string;
	createOptions?: TemplateCreateOption[];
}

export interface ImportedTemplateOption {
	id: string;
	name: string;
	description: string;
	sourceProjectPath: string;
	savedAt: string;
	fileCount: number;
	stack: ProjectStack;
}

export interface TemplateFileNode {
	id: string;
	name: string;
	path: string;
	type: "file";
	extension: string;
	size?: number;
	role?: FileRole;
	includeContent: boolean;
	content?: string;
	isBinary: boolean;
	locked?: boolean;
	source?: "imported" | "custom" | "generated";
}

export interface TemplateFolderNode {
	id: string;
	name: string;
	path: string;
	type: "folder";
	role?: FolderRole;
	locked?: boolean;
	source?: "imported" | "custom" | "generated";
}

export type TemplateTreeNode =
	TemplateFileNode | (TemplateFolderNode & { children: TemplateTreeNode[] });

export interface ImportedTemplateSnapshot {
	id: string;
	name: string;
	description: string;
	sourceProjectPath: string;
	savedAt: string;
	fileCount: number;
	stackDetection: StackDetectionResult;
	structure: {
		files: TemplateFileNode[];
		folders: TemplateFolderNode[];
		tree?: TemplateTreeNode[];
	};
	features: string[];
	tags: string[];
	metadata: {
		createdAt: string;
		updatedAt?: string;
		fileCount: number;
		folderCount: number;
		selectedItemCount: number;
		originalFileCount?: number;
	};
	tree: ProjectTreeNode[];
}
