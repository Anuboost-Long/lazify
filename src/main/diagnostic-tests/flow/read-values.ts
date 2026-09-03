import { FlowError } from "../errors";

export type Fields = Record<string, unknown>;

export function asFields(value: unknown, where: string): Fields {
	if (value === null || value === undefined) return {};
	if (typeof value !== "object" || Array.isArray(value)) {
		throw new FlowError("expected a set of named values", where);
	}

	return value as Fields;
}

export function rejectUnknownKeys(fields: Fields, allowed: readonly string[], where: string): void {
	const unexpected = Object.keys(fields).filter((key) => !allowed.includes(key));
	if (unexpected.length === 0) return;

	throw new FlowError(
		`unsupported ${unexpected.length === 1 ? "field" : "fields"} ${unexpected.join(", ")}. Supported: ${allowed.join(", ")}`,
		where,
	);
}

export function readString(fields: Fields, key: string, where: string): string {
	const value = fields[key];
	if (value === undefined || value === null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);

	throw new FlowError(`"${key}" must be text`, where);
}

export function requireString(fields: Fields, key: string, where: string): string {
	const value = readString(fields, key, where);
	if (!value) throw new FlowError(`"${key}" is required`, where);

	return value;
}

export function readBoolean(fields: Fields, key: string, where: string, fallback = false): boolean {
	const value = fields[key];
	if (value === undefined || value === null) return fallback;
	if (typeof value === "boolean") return value;

	throw new FlowError(`"${key}" must be true or false`, where);
}

export function readNumber(fields: Fields, key: string, where: string, fallback: number): number {
	const value = fields[key];
	if (value === undefined || value === null) return fallback;
	if (typeof value === "number" && Number.isFinite(value)) return value;

	throw new FlowError(`"${key}" must be a number`, where);
}

export function readChoice<T extends string>(
	fields: Fields,
	key: string,
	choices: readonly T[],
	where: string,
	fallback: T,
): T {
	const value = readString(fields, key, where);
	if (!value) return fallback;
	if ((choices as readonly string[]).includes(value)) return value as T;

	throw new FlowError(`"${key}" must be one of ${choices.join(", ")}`, where);
}
