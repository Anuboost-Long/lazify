const NULL_LITERALS = new Set(["", "~", "null", "Null", "NULL"]);
const TRUE_LITERALS = new Set(["true", "True", "TRUE", "yes", "Yes", "YES", "on", "On", "ON"]);
const FALSE_LITERALS = new Set(["false", "False", "FALSE", "no", "No", "NO", "off", "Off", "OFF"]);
const NUMBER_PATTERN = /^[-+]?(\d+(?:\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;

const DOUBLE_QUOTE_ESCAPES: Record<string, string> = {
	n: "\n",
	t: "\t",
	r: "\r",
	b: "\b",
	f: "\f",
	"0": "\0",
	'"': '"',
	"\\": "\\",
	"/": "/",
};

export function unescapeDoubleQuoted(body: string): string {
	let result = "";

	for (let index = 0; index < body.length; index += 1) {
		const character = body[index];

		if (character !== "\\") {
			result += character;
			continue;
		}

		const escape = body[index + 1];

		if (escape === "u") {
			const code = Number.parseInt(body.slice(index + 2, index + 6), 16);

			/** An escape that names no code point reads as NUL, as it always has. */
			result += Number.isNaN(code) ? "\0" : String.fromCodePoint(code);
			index += 5;
			continue;
		}

		result += DOUBLE_QUOTE_ESCAPES[escape] ?? escape;
		index += 1;
	}

	return result;
}

export function unquote(value: string): string | null {
	if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
		return unescapeDoubleQuoted(value.slice(1, -1));
	}

	if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1).replace(/''/g, "'");
	}

	return null;
}

export function parseScalar(text: string): string | number | boolean | null {
	const value = text.trim();
	const unquoted = unquote(value);

	if (unquoted !== null) return unquoted;
	if (NULL_LITERALS.has(value)) return null;
	if (TRUE_LITERALS.has(value)) return true;
	if (FALSE_LITERALS.has(value)) return false;
	if (NUMBER_PATTERN.test(value)) return Number(value);

	return value;
}
