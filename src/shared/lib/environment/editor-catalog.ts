export interface EditorDefinition {
	id: string;
	label: string;
	/** Everything after the program: how this editor takes a folder and a file. */
	args: string;
	/** Command names to look for on PATH. */
	programs: string[];
	/** Where the editor ships its own launcher, for a machine with no PATH entry. */
	paths: Partial<Record<string, string[]>>;
}

export interface DetectedEditor {
	id: string;
	label: string;
	/** The full template, program included, ready for the command runner. */
	command: string;
}

export interface EditorProbe {
	platform: string;
	pathDirectories: string[];
	exists: (candidate: string) => boolean;
}
