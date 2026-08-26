/** Whether a finished agent turn is formatted on its own or waits for a click. */
export type FormatMode = "auto" | "manual";

/**
 * The formatter this app falls back to when a project declares none of its own.
 * The field names are Prettier's, so a project that later adds a `.prettierrc`
 * gets the same shape it was already being given.
 */
export interface FormatterDefaults {
	printWidth: number;
	tabWidth: number;
	useTabs: boolean;
	semi: boolean;
	singleQuote: boolean;
	trailingComma: "none" | "es5" | "all";
	bracketSpacing: boolean;
	endOfLine: "lf" | "crlf" | "auto";
}

export interface FormatterSettings {
	mode: FormatMode;
	/** Whether formatting also sorts and groups each file's imports. */
	organizeImports: boolean;
	defaults: FormatterDefaults;
}

/** What a project brings to the job, read before anything is rewritten. */
export interface ProjectFormatter {
	/** The config file the project declares, relative to it. Null when it has none. */
	configFile: string | null;
}

export interface FormatFailure {
	path: string;
	message: string;
}

export interface FormatOutcome {
	/** Files whose contents this changed. */
	formatted: string[];
	/** Files left alone — already formatted, or nothing here can parse them. */
	unchanged: string[];
	failed: FormatFailure[];
	/** Null when the project declared no config and the app's defaults were used. */
	configFile: string | null;
}
