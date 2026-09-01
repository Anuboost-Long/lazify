import fs from "node:fs";
import path from "node:path";

import { app } from "electron";

import type { FormatMode, FormatterDefaults, FormatterSettings } from "./types";

/**
 * How the formatter behaves, and what it falls back to.
 *
 * Kept in the main process rather than the renderer because the auto pass runs
 * when an agent's turn ends, which is something only main hears. Manual until
 * the user says otherwise: rewriting files nobody asked to have rewritten is
 * the one thing this feature must not do by surprise.
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

function storeFilePath(): string {
	return path.join(app.getPath("userData"), "code-formatter.json");
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

export function getFormatterSettings(): FormatterSettings {
	try {
		return normalized(JSON.parse(fs.readFileSync(storeFilePath(), "utf8")));
	} catch {
		return {
			mode: DEFAULTS.mode,
			organizeImports: DEFAULTS.organizeImports,
			defaults: { ...DEFAULT_FORMATTER_DEFAULTS },
		};
	}
}

function save(settings: FormatterSettings): FormatterSettings {
	const filePath = storeFilePath();

	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

	return settings;
}

export function setFormatterMode(mode: FormatMode): FormatterSettings {
	return save({ ...getFormatterSettings(), mode });
}

export function setOrganizeImports(organizeImports: boolean): FormatterSettings {
	return save({ ...getFormatterSettings(), organizeImports });
}

export function setFormatterDefaults(defaults: Partial<FormatterDefaults>): FormatterSettings {
	const settings = getFormatterSettings();

	return save(normalized({ ...settings, defaults: { ...settings.defaults, ...defaults } }));
}
