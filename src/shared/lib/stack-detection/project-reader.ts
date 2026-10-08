export interface ProjectEntry {
	name: string;
	isDirectory: boolean;
}

export interface ProjectReader {
	exists(relativePath: string): Promise<boolean>;
	list(relativeDirectory: string): Promise<ProjectEntry[]>;
	readText(relativePath: string): Promise<string | null>;
}

export function joinPath(directory: string, name: string) {
	return directory ? `${directory}/${name}` : name;
}

export function extensionOf(filePath: string) {
	const name = baseName(filePath);
	const dot = name.lastIndexOf(".");

	return dot > 0 ? name.slice(dot) : "";
}

export function baseName(filePath: string, suffix?: string) {
	const name = filePath.slice(filePath.lastIndexOf("/") + 1);

	return suffix && name !== suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}
