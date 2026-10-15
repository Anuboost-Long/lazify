/**
 * What a script handed over, as the text the field it was given to stores.
 *
 * Anything that can say what it is keeps its own words — a number, a Date, an
 * array. A plain object cannot: "[object Object]" tells the script author
 * nothing about what they set, so it travels as JSON instead.
 */
export function scriptText(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value !== "object") return String(value);

	const own = (value as { toString?: () => string }).toString;

	if (typeof own === "function" && own !== Object.prototype.toString) {
		return String(own.call(value));
	}

	try {
		return JSON.stringify(value) ?? Object.prototype.toString.call(value);
	} catch {
		return Object.prototype.toString.call(value);
	}
}
