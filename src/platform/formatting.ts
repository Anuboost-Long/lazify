import type { ChainError } from "@chain/sdk";

import { getWorkingChanges } from "@/shared/lib/git/agent-changes";
import { getFormatterSettings } from "@/shared/lib/formatting/formatter-settings";
import type { FormatOutcome, FormatterDefaults, ProjectFormatter } from "@/shared/lib/formatting/types";
import type { FormatterCall } from "@/shared/lib/formatting/worker-protocol";
import { sha1Hex } from "@/shared/lib/sha1";

import { execFile } from "./exec";
import { appDataPath, createFolder, deletePath, listFolderNames, pathExists, writeTextFile } from "./folders";

export {
	getFormatterSettings as formatterSettings,
	setFormatterDefaults,
	setFormatterMode,
	setOrganizeImports,
} from "@/shared/lib/formatting/formatter-settings";

const NODE_MISSING = "Formatting needs Node.js, which wasn't found. Install Node.js, then try again.";

type FormattedEvent = FormatOutcome & { projectPath: string };

const formattedListeners = new Set<(event: FormattedEvent) => void>();

let installed: Promise<string> | null = null;

/** Prettier runs under the user's Node, from a copy of the bundled formatter in the app's data folder. */
function installFormatter(): Promise<string> {
	installed ??= (async () => {
		// Raw, because Vite's dev server rewrites a module it serves by URL.
		const { default: source } = await import("../../node/formatter/dist/formatter.mjs?raw");
		const folder = `${await appDataPath()}/formatter`;
		const file = `${folder}/formatter-${sha1Hex(source).slice(0, 12)}.mjs`;

		if (!(await pathExists(file))) {
			await createFolder(folder);
			await writeTextFile(file, source);

			for (const name of await listFolderNames(folder)) {
				if (`${folder}/${name}` !== file) await deletePath(`${folder}/${name}`);
			}
		}

		return file;
	})().catch((error: unknown) => {
		installed = null;
		throw error;
	});

	return installed;
}

async function callFormatter<T>(call: FormatterCall): Promise<T> {
	const formatter = await installFormatter();

	try {
		// Run from the app's own folder, as Electron ran Prettier from outside the project.
		const { stdout } = await execFile("node", [formatter, JSON.stringify(call)], {
			cwd: await appDataPath(),
			maxBuffer: 16 * 1024 * 1024,
		});
		return JSON.parse(stdout) as T;
	} catch (error) {
		if ((error as Partial<ChainError> | null)?.code === "NOT_FOUND") throw new Error(NODE_MISSING);
		throw error;
	}
}

export async function projectFormatter(projectPath: string): Promise<ProjectFormatter> {
	try {
		return await callFormatter<ProjectFormatter>({ command: "project-formatter", projectPath });
	} catch {
		return { configFile: null };
	}
}

export function formatSample(defaults: FormatterDefaults): Promise<string> {
	return callFormatter<string>({ command: "sample", defaults });
}

/**
 * @param only the paths to format, relative to the project. Omitted, every file
 * the session has changed is taken.
 */
export async function formatChangedFiles(
	projectPath: string,
	only?: string[],
	mode: "write" | "preview" = "write",
): Promise<FormatOutcome> {
	const settings = await getFormatterSettings();
	const paths = only ?? (await getWorkingChanges(projectPath)).map((change) => change.path);

	try {
		return await callFormatter<FormatOutcome>({
			command: "format",
			request: { projectPath, paths, mode, organizeImports: settings.organizeImports, defaults: settings.defaults },
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Could not format";
		return { formatted: [], unchanged: [], failed: paths.map((path) => ({ path, message })), configFile: null };
	}
}

export async function formatAfterTurn(projectPath: string): Promise<void> {
	if ((await getFormatterSettings()).mode !== "auto") return;

	const outcome = await formatChangedFiles(projectPath);

	if (outcome.formatted.length === 0 && outcome.failed.length === 0) return;

	for (const listener of formattedListeners) listener({ projectPath, ...outcome });
}

export function onCodeFormatted(callback: (event: FormattedEvent) => void): () => void {
	formattedListeners.add(callback);

	return () => {
		formattedListeners.delete(callback);
	};
}
