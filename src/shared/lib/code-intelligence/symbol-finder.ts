export interface SymbolDefinition {
	absolutePath: string;
	relativePath: string;
	/** 1-based, so it can be handed straight to an editor gutter. */
	line: number;
	/** How the match was made, for callers that want to say. */
	kind: "export" | "declaration" | "file";
}

export interface FileListEntry {
	files: string[];
	readAt: number;
}
