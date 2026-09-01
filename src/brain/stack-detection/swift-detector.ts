import fs from "node:fs/promises";
import path from "node:path";

/**
 * Swift projects are not announced by one well-known file the way a Node project
 * is by `package.json`. A package has `Package.swift`; an app has `MyApp.xcodeproj`,
 * which is a *directory*, not a file; a CocoaPods app adds a `.xcworkspace` that
 * must be opened instead of the project. So this looks for any of them, the way
 * the .NET detector looks for any `*.csproj`.
 *
 * Two rules keep it honest:
 *
 *  - **Only the root can claim the repository.** A React Native app carries a
 *    complete Xcode project, a Podfile and a workspace under `ios/`. Finding
 *    those one level down must never reclassify the repo as Swift, so markers
 *    are read at the root and nowhere else.
 *  - **Sources are only read once a marker is found.** Classifying SwiftUI against
 *    UIKit means reading Swift, and this runs on every project import. A repo
 *    with no Swift marker at its root costs one directory listing.
 */

/** Never worth descending into when looking for Swift sources. */
const SKIPPED_DIRECTORIES = new Set([
	".git",
	".build",
	".swiftpm",
	"DerivedData",
	"Pods",
	"Carthage",
	"node_modules",
	"fastlane",
	"build",
]);

/** Deep enough for `Sources/App/ContentView.swift`, and no deeper. */
const MAX_SCAN_DEPTH = 3;

/** Enough Swift to tell one UI framework from the other, not a whole app. */
const MAX_SOURCE_FILES_READ = 40;

/** A view file that says which framework it uses says so at the top. */
const MAX_SOURCE_BYTES = 8 * 1024;

/**
 * Which UI framework the app is written against, or null when there is Swift
 * here but nothing that says either way — a library, or a command-line tool.
 */
export type SwiftUiKind = "swiftui" | "uikit";

export interface SwiftDetectionResult {
	/** Root-relative `Package.swift`, when this is a Swift Package. */
	packageFile: string | null;
	/** Root-relative `*.xcodeproj`, when there is an Xcode project. */
	xcodeProject: string | null;
	/** Root-relative `*.xcworkspace`. Opened in preference to the project. */
	xcodeWorkspace: string | null;
	podfile: string | null;
	/** Best guess at the scheme to build: the workspace or project's own name. */
	scheme: string | null;
	ui: SwiftUiKind | null;
	swiftFileCount: number;
	reasons: string[];
}

export function emptySwiftDetection(): SwiftDetectionResult {
	return {
		packageFile: null,
		xcodeProject: null,
		xcodeWorkspace: null,
		podfile: null,
		scheme: null,
		ui: null,
		swiftFileCount: 0,
		reasons: [],
	};
}

async function readDirectorySafely(directory: string) {
	try {
		return await fs.readdir(directory, { withFileTypes: true });
	} catch {
		return [];
	}
}

/**
 * The markers at the top of the repository. Only these decide whether the
 * project is Swift's to claim.
 */
async function collectRootMarkers(projectRoot: string) {
	const result = emptySwiftDetection();
	let hasRootSwiftFile = false;

	for (const entry of await readDirectorySafely(projectRoot)) {
		const name = entry.name;

		// `.xcodeproj` and `.xcworkspace` are bundles — directories that behave as
		// one file, which is why this tests the name rather than the entry type.
		if (name.endsWith(".xcworkspace")) result.xcodeWorkspace ??= name;
		else if (name.endsWith(".xcodeproj")) result.xcodeProject ??= name;
		else if (name === "Package.swift") result.packageFile = name;
		else if (name === "Podfile") result.podfile = name;
		else if (name.endsWith(".swift")) hasRootSwiftFile = true;
	}

	const claimed =
		result.packageFile !== null ||
		result.xcodeProject !== null ||
		result.xcodeWorkspace !== null ||
		hasRootSwiftFile;

	return { result, claimed };
}

/** Every Swift source under the root, bounded in both depth and count. */
async function collectSwiftSources(projectRoot: string) {
	const files: string[] = [];

	const scan = async (relativeDirectory: string, depth: number) => {
		for (const entry of await readDirectorySafely(path.join(projectRoot, relativeDirectory))) {
			const relativePath = relativeDirectory
				? path.posix.join(relativeDirectory, entry.name)
				: entry.name;

			if (entry.isDirectory()) {
				const skip =
					SKIPPED_DIRECTORIES.has(entry.name) ||
					entry.name.startsWith(".") ||
					// Bundles hold build metadata, not sources worth classifying.
					entry.name.endsWith(".xcodeproj") ||
					entry.name.endsWith(".xcworkspace");

				if (!skip && depth + 1 < MAX_SCAN_DEPTH) {
					await scan(relativePath, depth + 1);
				}
				continue;
			}

			if (entry.name.endsWith(".swift")) files.push(relativePath);
		}
	};

	await scan("", 0);

	return files;
}

async function readHead(projectRoot: string, relativePath: string) {
	try {
		const contents = await fs.readFile(path.join(projectRoot, relativePath), "utf8");
		return contents.slice(0, MAX_SOURCE_BYTES);
	} catch {
		return "";
	}
}

const SWIFTUI_MARKERS: Array<{ pattern: RegExp; reason: string }> = [
	{ pattern: /^[ \t]*import\s+SwiftUI\b/m, reason: "imports SwiftUI" },
	// `@main struct MyApp: App` — the SwiftUI lifecycle entry point.
	{ pattern: /@main\b[\s\S]{0,200}?:\s*App\b/, reason: "declares a SwiftUI App entry point" },
	{ pattern: /struct\s+\w+\s*:\s*View\b/, reason: "declares a SwiftUI View" },
];

const UIKIT_MARKERS: Array<{ pattern: RegExp; reason: string }> = [
	{ pattern: /^[ \t]*import\s+UIKit\b/m, reason: "imports UIKit" },
	{ pattern: /UIApplicationDelegate|UIViewController\b/, reason: "uses UIKit controllers" },
];

/**
 * Reads enough sources to say which UI framework this is.
 *
 * SwiftUI wins a tie on purpose: a SwiftUI app routinely imports UIKit for the
 * things SwiftUI still cannot do — a `UIViewRepresentable` wrapper, a haptic —
 * whereas a UIKit app has no reason to declare a `View`. Evidence of SwiftUI is
 * therefore the stronger statement, even alongside UIKit.
 */
async function classifyUi(
	projectRoot: string,
	swiftFiles: string[],
): Promise<{ ui: SwiftUiKind | null; reason: string | null }> {
	let uikitReason: string | null = null;

	for (const relativePath of swiftFiles.slice(0, MAX_SOURCE_FILES_READ)) {
		const contents = await readHead(projectRoot, relativePath);

		for (const marker of SWIFTUI_MARKERS) {
			if (marker.pattern.test(contents)) {
				return { ui: "swiftui", reason: `${path.basename(relativePath)} ${marker.reason}` };
			}
		}

		if (uikitReason) continue;

		for (const marker of UIKIT_MARKERS) {
			if (marker.pattern.test(contents)) {
				uikitReason = `${path.basename(relativePath)} ${marker.reason}`;
				break;
			}
		}
	}

	return uikitReason ? { ui: "uikit", reason: uikitReason } : { ui: null, reason: null };
}

/** The package's own name, which is also the scheme `swift run` builds. */
function packageNameOf(contents: string): string | null {
	return /name:\s*"([^"]+)"/.exec(contents)?.[1] ?? null;
}

/**
 * Looks for a Swift project at `projectRoot`. Everything null means "not Swift"
 * — callers key off that rather than a flag, as they do for .NET.
 */
export async function detectSwiftProject(projectRoot: string): Promise<SwiftDetectionResult> {
	const { result, claimed } = await collectRootMarkers(projectRoot);

	if (!claimed) return result;

	if (result.xcodeWorkspace) {
		result.reasons.push(`${result.xcodeWorkspace} workspace exists`);
	}

	if (result.xcodeProject) {
		result.reasons.push(`${result.xcodeProject} project exists`);
	}

	if (result.podfile) {
		result.reasons.push("Podfile exists");
	}

	if (result.packageFile) {
		result.reasons.push("Package.swift exists");
	}

	// The workspace names the scheme when there is one, because that is what has
	// to be opened once CocoaPods is involved; otherwise the project does.
	const schemeSource = result.xcodeWorkspace ?? result.xcodeProject;

	if (schemeSource) {
		result.scheme = path.basename(schemeSource, path.extname(schemeSource));
	} else if (result.packageFile) {
		result.scheme = packageNameOf(await readHead(projectRoot, result.packageFile));
	}

	const swiftFiles = await collectSwiftSources(projectRoot);
	result.swiftFileCount = swiftFiles.length;

	if (swiftFiles.length > 0) {
		result.reasons.push(
			`${swiftFiles.length} Swift ${swiftFiles.length === 1 ? "file" : "files"} found`,
		);
	}

	const { ui, reason } = await classifyUi(projectRoot, swiftFiles);
	result.ui = ui;

	if (reason) result.reasons.push(reason);

	return result;
}
