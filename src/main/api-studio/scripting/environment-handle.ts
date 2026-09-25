import { scriptText } from "./script-text";

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

export function createEnvironmentHandle(
	values: Record<string, string>,
	variables: EnvironmentVariableKey[] = [],
): EnvironmentHandle {
	const current = { ...values };
	const changed: Record<string, string> = {};

	// A script names a variable the way the UI shows it — `Authorization` —
	// but values are stored under the variable's key, which a header name does
	// not always match once camelCased (`authorization`). Resolve to the key
	// so env.set lands where the rest of the app, and the request builder,
	// actually read it back from.
	const keyFor = (name: string) =>
		variables.find((variable) => variable.key === name || variable.name === name)?.key ?? name;

	const write = (name: string, value: string) => {
		const key = keyFor(name);
		current[key] = value;
		changed[key] = value;
	};

	return {
		handle: {
			get: (name) => current[keyFor(String(name))] ?? null,
			set: (name, value) => write(String(name), scriptText(value)),
			has: (name) => Boolean(current[keyFor(String(name))]),
			unset: (name) => write(String(name), ""),
		},
		values: current,
		changed,
	};
}
