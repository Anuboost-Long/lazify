/**
 * One assignment in a .env file.
 *
 * `line` is the 0-based line it occupies, and is how an edit addresses it —
 * paired with the key, so an edit aimed at a file that has since changed is
 * rejected rather than applied to the wrong row.
 */
export interface EnvVariable {
	line: number;
	key: string;
	value: string;
	/** False when the assignment is commented out: present, listed, but inert. */
	enabled: boolean;
	/** The quote style the value was written with, preserved on rewrite. */
	quote: "" | "'" | '"';
	exported: boolean;
	/** Trailing `# …` note, kept with the variable it annotates. */
	comment: string | null;
	indent: string;
}

export type EnvVariablePatch = Partial<Pick<EnvVariable, "key" | "value" | "enabled">>;

export interface EnvFileSummary {
	name: string;
	path: string;
	variableCount: number;
	disabledCount: number;
}

export interface ProjectEnvFile {
	name: string;
	path: string;
	variables: EnvVariable[];
}
