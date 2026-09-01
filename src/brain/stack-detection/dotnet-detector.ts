import fs from "node:fs/promises";
import path from "node:path";

/**
 * .NET projects are not described by a single well-known file the way a Node
 * project is by `package.json` — the marker is *any* `*.csproj`/`*.fsproj`/
 * `*.vbproj`/`*.sln` — so this scans the root (and one level down, which is
 * where the `src/`-style solution layouts keep their projects) instead of
 * stat-ing a fixed list like `createRootFileDetector` does.
 */

const PROJECT_EXTENSIONS = new Set([".csproj", ".fsproj", ".vbproj"]);
const SOLUTION_EXTENSIONS = new Set([".sln", ".slnx"]);

/** Folders never worth descending into when hunting for a project file. */
const SKIPPED_DIRECTORIES = new Set([
	".git",
	".vs",
	"bin",
	"obj",
	"node_modules",
	"packages",
	"artifacts",
	"TestResults",
]);

export type DotnetFlavor = "aspnet" | "blazor" | "maui" | "dotnet-console";

export interface DotnetDetectionResult {
	/** Root-relative path of the solution file, when there is one. */
	solutionFile: string | null;
	/** Root-relative paths of every project file found. */
	projectFiles: string[];
	/** The project to run — a web/app project when we can tell, else the first. */
	entryProjectFile: string | null;
	language: "csharp" | "fsharp" | "vb" | null;
	flavor: DotnetFlavor;
	/** `net8.0` and friends, straight out of the project file. */
	targetFramework: string | null;
	reasons: string[];
}

export function emptyDotnetDetection(): DotnetDetectionResult {
	return {
		solutionFile: null,
		projectFiles: [],
		entryProjectFile: null,
		language: null,
		flavor: "dotnet-console",
		targetFramework: null,
		reasons: [],
	};
}

function languageOf(projectFile: string): DotnetDetectionResult["language"] {
	const extension = path.extname(projectFile).toLowerCase();

	if (extension === ".fsproj") return "fsharp";
	if (extension === ".vbproj") return "vb";

	return "csharp";
}

async function readDirectorySafely(directory: string) {
	try {
		return await fs.readdir(directory, { withFileTypes: true });
	} catch {
		return [];
	}
}

/**
 * Deep enough to reach `src/Api/Api.csproj`, which is where the conventional
 * solution layout puts projects, and no deeper — this runs on every import.
 */
const MAX_SCAN_DEPTH = 3;

async function collectCandidates(projectRoot: string) {
	const solutions: string[] = [];
	const projects: string[] = [];

	const scan = async (relativeDirectory: string, depth: number) => {
		const entries = await readDirectorySafely(path.join(projectRoot, relativeDirectory));

		for (const entry of entries) {
			const relativePath = relativeDirectory
				? path.posix.join(relativeDirectory, entry.name)
				: entry.name;

			if (entry.isDirectory()) {
				if (
					depth + 1 < MAX_SCAN_DEPTH &&
					!SKIPPED_DIRECTORIES.has(entry.name) &&
					!entry.name.startsWith(".")
				) {
					await scan(relativePath, depth + 1);
				}
				continue;
			}

			const extension = path.extname(entry.name).toLowerCase();

			if (SOLUTION_EXTENSIONS.has(extension)) solutions.push(relativePath);
			if (PROJECT_EXTENSIONS.has(extension)) projects.push(relativePath);
		}
	};

	await scan("", 0);

	return { solutions, projects };
}

async function readProjectFile(projectRoot: string, relativePath: string) {
	try {
		return await fs.readFile(path.join(projectRoot, relativePath), "utf8");
	} catch {
		return "";
	}
}

function flavorOf(contents: string): { flavor: DotnetFlavor; reason: string | null } {
	if (/UseMaui\s*>\s*true|Microsoft\.NET\.Sdk\.Maui/i.test(contents)) {
		return { flavor: "maui", reason: "project targets .NET MAUI" };
	}

	if (/Microsoft\.NET\.Sdk\.BlazorWebAssembly|Microsoft\.AspNetCore\.Components/i.test(contents)) {
		return { flavor: "blazor", reason: "Blazor SDK or components referenced" };
	}

	if (/Microsoft\.NET\.Sdk\.Web/i.test(contents)) {
		return { flavor: "aspnet", reason: "Microsoft.NET.Sdk.Web SDK found" };
	}

	return { flavor: "dotnet-console", reason: null };
}

function targetFrameworkOf(contents: string): string | null {
	const single = /<TargetFramework>\s*([^<\s]+)\s*<\/TargetFramework>/i.exec(contents);
	if (single) return single[1];

	const multiple = /<TargetFrameworks>([^<]+)<\/TargetFrameworks>/i.exec(contents);
	if (multiple) return multiple[1].split(";")[0].trim() || null;

	return null;
}

/**
 * Looks for a .NET project under `projectRoot`. `projectFiles` empty means
 * "not a .NET project" — every caller keys off that rather than a flag.
 */
export async function detectDotnetProject(projectRoot: string): Promise<DotnetDetectionResult> {
	const { solutions, projects } = await collectCandidates(projectRoot);
	const result = emptyDotnetDetection();

	if (solutions.length === 0 && projects.length === 0) {
		return result;
	}

	result.solutionFile = solutions[0] ?? null;
	result.projectFiles = projects;
	result.entryProjectFile = projects[0] ?? null;

	if (result.solutionFile) {
		result.reasons.push(`${path.basename(result.solutionFile)} solution file exists`);
	}

	// A web/app project wins over a class library, so `dotnet run` targets
	// something that actually starts.
	let entryReason: string | null = null;

	for (const projectFile of projects) {
		const contents = await readProjectFile(projectRoot, projectFile);
		const { flavor, reason } = flavorOf(contents);
		const targetFramework = targetFrameworkOf(contents);

		result.targetFramework ??= targetFramework;

		if (flavor !== "dotnet-console" && result.flavor === "dotnet-console") {
			result.entryProjectFile = projectFile;
			result.flavor = flavor;
			result.targetFramework = targetFramework ?? result.targetFramework;
			entryReason = reason;
		}
	}

	if (entryReason) result.reasons.push(entryReason);

	if (result.entryProjectFile) {
		result.language = languageOf(result.entryProjectFile);
		result.reasons.push(`${path.basename(result.entryProjectFile)} project file exists`);
	}

	if (result.targetFramework) {
		result.reasons.push(`targets ${result.targetFramework}`);
	}

	return result;
}
