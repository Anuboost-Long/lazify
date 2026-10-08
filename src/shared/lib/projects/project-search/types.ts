export interface ProjectSearchQuery {
	query: string;
	matchCase: boolean;
	wholeWord: boolean;
	useRegex: boolean;
	include: string;
	exclude: string;
	useIgnoreFiles: boolean;
}

export interface ProjectSearchMatch {
	line: number;
	preview: string;
	start: number;
	end: number;
}

export interface ProjectSearchFile {
	absolutePath: string;
	relativePath: string;
	name: string;
	directory: string;
	matches: ProjectSearchMatch[];
}

export interface ProjectSearchResult {
	files: ProjectSearchFile[];
	fileCount: number;
	matchCount: number;
	truncated: boolean;
	error: string | null;
}
