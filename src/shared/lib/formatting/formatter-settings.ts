import { appDataPath, readTextFile, writeTextFile } from "@/platform/folders";

import type { FormatMode, FormatterDefaults, FormatterSettings } from "./types";

/**
 * How the formatter behaves, and what it falls back to.
 *
 * Manual until the user says otherwise: rewriting files nobody asked to have
 * rewritten is the one thing this feature must not do by surprise.
 */

export const DEFAULT_FORMATTER_DEFAULTS: FormatterDefaults = {
	printWidth: 100,
	tabWidth: 2,
	useTabs: false,
	semi: true,
	singleQuote: false,
	trailingComma: "none",
	bracketSpacing: true,
	endOfLine: "lf",
};

const DEFAULTS: FormatterSettings = {
	mode: "manual",
	organizeImports: true,
	defaults: { ...DEFAULT_FORMATTER_DEFAULTS },
};

async function storeFilePath(): Promise<string> {
	return `${await appDataPath()}/code-formatter.json`;
}

function numberOr(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
	return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalized(parsed: Partial<FormatterSettings>): FormatterSettings {
	const defaults: Partial<FormatterDefaults> = parsed.defaults ?? {};

	return {
		mode: oneOf(parsed.mode, ["auto", "manual"] as const, DEFAULTS.mode),
		organizeImports: parsed.organizeImports !== false,
		defaults: {
			printWidth: numberOr(defaults.printWidth, DEFAULT_FORMATTER_DEFAULTS.printWidth),
			tabWidth: numberOr(defaults.tabWidth, DEFAULT_FORMATTER_DEFAULTS.tabWidth),
			useTabs: defaults.useTabs === true,
			semi: defaults.semi !== false,
			singleQuote: defaults.singleQuote === true,
			trailingComma: oneOf(
				defaults.trailingComma,
				["none", "es5", "all"] as const,
				DEFAULT_FORMATTER_DEFAULTS.trailingComma,
			),
			bracketSpacing: defaults.bracketSpacing !== false,
			endOfLine: oneOf(
				defaults.endOfLine,
				["lf", "crlf", "auto"] as const,
				DEFAULT_FORMATTER_DEFAULTS.endOfLine,
			),
		},
	};
}

export async function getFormatterSettings(): Promise<FormatterSettings> {
	try {
		return normalized(JSON.parse((await readTextFile(await storeFilePath())) ?? ""));
	} catch {
		return {
			mode: DEFAULTS.mode,
			organizeImports: DEFAULTS.organizeImports,
			defaults: { ...DEFAULT_FORMATTER_DEFAULTS },
		};
	}
}

async function save(settings: FormatterSettings): Promise<FormatterSettings> {
	await writeTextFile(await storeFilePath(), `${JSON.stringify(settings, null, 2)}\n`);

	return settings;
}

export async function setFormatterMode(mode: FormatMode): Promise<FormatterSettings> {
	return save({ ...(await getFormatterSettings()), mode });
}

export async function setOrganizeImports(organizeImports: boolean): Promise<FormatterSettings> {
	return save({ ...(await getFormatterSettings()), organizeImports });
}

export async function setFormatterDefaults(defaults: Partial<FormatterDefaults>): Promise<FormatterSettings> {
	const settings = await getFormatterSettings();

	return save(normalized({ ...settings, defaults: { ...settings.defaults, ...defaults } }));
}
