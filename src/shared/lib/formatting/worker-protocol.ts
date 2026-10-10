import type { FormatterDefaults } from "./types";

export interface FormatRequest {
	projectPath: string;
	/** Relative to the project. */
	paths: string[];
	mode: "write" | "preview";
	organizeImports: boolean;
	/** Applied only where the project's own Prettier config says nothing. */
	defaults: FormatterDefaults;
}

/** The single argument the Node formatter is run with, as JSON. */
export type FormatterCall =
	| { command: "format"; request: FormatRequest }
	| { command: "project-formatter"; projectPath: string }
	| { command: "sample"; defaults: FormatterDefaults };
