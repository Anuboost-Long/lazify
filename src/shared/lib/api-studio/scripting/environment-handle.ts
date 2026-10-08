/** Just enough of a declared variable to tell a script's name from its key. */
export interface EnvironmentVariableKey {
	key: string;
	name: string;
}

export interface EnvironmentHandle {
	handle: {
		get: (name: string) => string | null;
		set: (name: string, value: unknown) => void;
		has: (name: string) => boolean;
		unset: (name: string) => void;
	};
	values: Record<string, string>;
	changed: Record<string, string>;
}
