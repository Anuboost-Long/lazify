import { scriptText } from "./script-text";

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

export function createEnvironmentHandle(values: Record<string, string>): EnvironmentHandle {
	const current = { ...values };
	const changed: Record<string, string> = {};

	const write = (name: string, value: string) => {
		current[name] = value;
		changed[name] = value;
	};

	return {
		handle: {
			get: (name) => current[String(name)] ?? null,
			set: (name, value) => write(String(name), scriptText(value)),
			has: (name) => Boolean(current[String(name)]),
			unset: (name) => write(String(name), ""),
		},
		values: current,
		changed,
	};
}
