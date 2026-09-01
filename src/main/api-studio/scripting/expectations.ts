/** Whatever JSON cannot hold: a function, a symbol, or a value that refers to itself. */
function beyondJson(value: unknown): string {
	if (typeof value === "object" && value !== null) return Object.prototype.toString.call(value);

	return String(value);
}

function readable(value: unknown): string {
	if (typeof value === "string") return JSON.stringify(value);
	if (value === undefined) return "undefined";

	try {
		return JSON.stringify(value) ?? beyondJson(value);
	} catch {
		return beyondJson(value);
	}
}

function equal(left: unknown, right: unknown): boolean {
	return left === right || readable(left) === readable(right);
}

export interface Expectation {
	toBe: (expected: unknown) => void;
	toEqual: (expected: unknown) => void;
	toContain: (expected: string) => void;
	toBeTruthy: () => void;
	toBeFalsy: () => void;
}

export function expectationsFor(actual: unknown): Expectation {
	const fail = (wanted: string): never => {
		throw new Error(`Expected ${wanted}, got ${readable(actual)}`);
	};

	return {
		toBe: (expected) => {
			if (actual !== expected) fail(readable(expected));
		},
		toEqual: (expected) => {
			if (!equal(actual, expected)) fail(readable(expected));
		},
		toContain: (expected) => {
			const holder = typeof actual === "string" ? actual : readable(actual);

			if (!holder.includes(expected)) fail(`something containing ${readable(expected)}`);
		},
		toBeTruthy: () => {
			if (!actual) fail("a truthy value");
		},
		toBeFalsy: () => {
			if (actual) fail("a falsy value");
		},
	};
}
