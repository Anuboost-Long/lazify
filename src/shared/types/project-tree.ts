export type FileRole =
	| "entry-point"
	| "config"
	| "api"
	| "ui"
	| "hook"
	| "type"
	| "asset"
	| "style"
	| "state"
	| "navigation"
	| "service"
	| "unknown";

export type FolderRole =
	| "ui-layer"
	| "data-layer"
	| "shared-ui"
	| "static"
	| "types"
	| "navigation"
	| "state"
	| "services"
	| "config"
	| "unknown";

export type ProjectStack =
	| "react-vite"
	| "react-next"
	| "react-cra"
	| "react-unknown"
	| "react-native-expo"
	| "react-native-cli"
	| "node-api"
	| "electron"
	| "dotnet"
	/** Swift with SwiftUI views — the split matters, the tooling does not. */
	| "swift-ui"
	/** Swift without SwiftUI: UIKit, a package, or a command-line tool. */
	| "swift"
	| "unknown";

export type DetectedPackageManager =
	"npm" | "yarn" | "pnpm" | "bun" | "dotnet" | "swiftpm" | "cocoapods" | "unknown";

export interface PackageOption {
	name: string;
	version: string;
	description: string;
	keywords: string[];
	publisher: string | null;
}

export interface ProjectTreeNode {
	id: string;
	name: string;
	type: "file" | "folder";
	source: "cli" | "module" | "custom";
	locked: boolean;
	content?: string;
	children: ProjectTreeNode[];
}

export interface StackDetectionResult {
	stack: ProjectStack;
	framework: "react" | "react-native" | "node" | "electron" | "dotnet" | "swift" | "unknown";
	metaFramework:
		| "vite"
		| "nextjs"
		| "expo"
		| "react-native-cli"
		| "cra"
		| "express"
		| "electron"
		| "aspnet"
		| "blazor"
		| "maui"
		| "dotnet-console"
		| "swiftui"
		| "uikit"
		| "swiftpm"
		| "unknown";
	packageManager: DetectedPackageManager;
	commands: {
		install: string;
		dev?: string;
		start?: string;
		build?: string;
		preview?: string;
		test?: string;
		lint?: string;
		android?: string;
		ios?: string;
		web?: string;
	};
	confidence: number;
	reasons: string[];
	warnings: string[];
}

export interface ImportedProjectScanResult {
	projectName: string;
	projectPath: string;
	stackDetection: StackDetectionResult;
	tree: ProjectTreeNode[];
}

export interface ImportedProjectIndexNode {
	id: string;
	name: string;
	type: "file" | "folder";
	relativePath: string;
	absolutePath: string;
	children: ImportedProjectIndexNode[];
}

export interface ImportedProjectIndexResult {
	projectName: string;
	projectPath: string;
	stackDetection: StackDetectionResult;
	tree: ImportedProjectIndexNode[];
}

/**
 * Where the in-app updater has got to. "unsupported" is the development build,
 * which has no packaged app to replace.
 */

/** A file the editor renders instead of reading: an image or a PDF. */
export interface ProjectAssetFile {
	mimeType: string;
	/** The file's bytes, base64 encoded for the trip across IPC. */
	base64: string;
	byteLength: number;
}
