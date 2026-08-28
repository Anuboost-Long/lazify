import type { EnvVariable } from "../../../renderer/shared/types/lazify";

/**
 * Reading and writing a single line of a .env file.
 *
 * The unit of work is the line, not the file: a project's .env is hand-written,
 * often heavily commented, and frequently the only copy of a credential that
 * exists anywhere. Editing one variable therefore rewrites exactly one line and
 * leaves every other byte — blank lines, section banners, ordering, the
 * trailing newline — untouched.
 *
 * A commented-out assignment (`# PORT=3000`) is a real variable in a disabled
 * state rather than a comment: that is how people park a value they intend to
 * come back to, so it is listed and can be switched back on. A comment that is
 * not an assignment is left alone as prose.
 */

/** `export ` is optional, and dots are legal in the keys some tools read. */
const ASSIGNMENT = /^(\s*)(export\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=(.*)$/;

/** A comment line, unwrapped far enough to ask whether it is an assignment. */
const COMMENT = /^(\s*)#+[ \t]?(.*)/;

interface ValueParts {
	value: string;
	quote: EnvVariable["quote"];
	comment: string | null;
}

function readQuote(trimmed: string): EnvVariable["quote"] {
	if (trimmed.startsWith('"')) return '"';
	if (trimmed.startsWith("'")) return "'";

	return "";
}

/**
 * Splits the right-hand side into the value and whatever trails it.
 *
 * Returns null for a quote that never closes: that is either a multi-line value
 * or a typo, and in both cases this parser cannot see enough of it to rewrite
 * the line safely, so the caller keeps the line as opaque text.
 */
function readValue(rest: string): ValueParts | null {
	const trimmed = rest.trimStart();
	const quote = readQuote(trimmed);

	if (quote === "") {
		// Only whitespace-then-hash opens a comment, so `pass#word` stays a value.
		const hash = trimmed.search(/\s#/);
		const value = hash === -1 ? trimmed.trimEnd() : trimmed.slice(0, hash).trimEnd();
		const after = hash === -1 ? "" : trimmed.slice(hash);
		return { value, quote, comment: readComment(after) };
	}

	let index = 1;
	let value = "";
	while (index < trimmed.length) {
		const char = trimmed[index];
		// Backslash escapes are a double-quote feature; inside single quotes the
		// backslash is literal, the way every dotenv reader treats it.
		if (char === "\\" && quote === '"' && index + 1 < trimmed.length) {
			value += trimmed[index + 1];
			index += 2;
			continue;
		}
		if (char === quote) return { value, quote, comment: readComment(trimmed.slice(index + 1)) };
		value += char;
		index += 1;
	}

	return null;
}

function readComment(after: string): string | null {
	const hash = after.indexOf("#");
	return hash === -1 ? null : after.slice(hash + 1).trim() || null;
}

/**
 * Reads one line as a variable, or returns null when the line is anything else
 * — blank, prose, a section banner, or a value this parser will not risk
 * rewriting.
 */
export function parseEnvLine(raw: string, line: number): EnvVariable | null {
	const comment = COMMENT.exec(raw);
	const body = comment ? comment[2] : raw;
	const assignment = ASSIGNMENT.exec(body);
	if (!assignment) return null;

	const parts = readValue(assignment[4]);
	if (!parts) return null;

	return {
		line,
		key: assignment[3],
		value: parts.value,
		enabled: comment === null,
		quote: parts.quote,
		exported: Boolean(assignment[2]),
		comment: parts.comment,
		indent: (comment ? comment[1] : assignment[1]) ?? "",
	};
}

export function parseEnvFile(text: string): EnvVariable[] {
	return splitLines(text)
		.map((raw, index) => parseEnvLine(raw, index))
		.filter((variable): variable is EnvVariable => variable !== null);
}

/** Keeps CRLF files CRLF — a rewritten line should not flip the whole diff. */
export function splitLines(text: string): string[] {
	return text.split("\n");
}

function quoteValue(value: string, quote: EnvVariable["quote"]): string {
	// A value that gained a space or a hash has to be quoted now even if it was
	// written bare before, or the next reader would truncate it.
	const needsQuote = quote !== "" || value === "" || /\s|#/.test(value);
	if (!needsQuote) return value;

	// Single quotes cannot escape their own quote, so a value containing one is
	// promoted to double quotes rather than silently mangled.
	const style = quote === "'" && !value.includes("'") ? "'" : '"';
	if (style === "'") return `'${value}'`;
	return `"${value.replace(/\\/g, String.raw`\\`).replace(/"/g, String.raw`\"`)}"`;
}

export function renderEnvVariable(variable: EnvVariable): string {
	const prefix = `${variable.indent}${variable.enabled ? "" : "# "}${variable.exported ? "export " : ""}`;
	const trailing = variable.comment ? ` # ${variable.comment}` : "";

	return `${prefix}${variable.key}=${quoteValue(variable.value, variable.quote)}${trailing}`;
}
