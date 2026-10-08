import { MATCHERS, membersAt, type ApiNode, type ScriptPhase } from "./catalog";
import { COMMON_MEMBERS, JS_GLOBALS, jsNamespace } from "./javascript";
import { catalogFor } from "./postman";

export interface Suggestion {
	label: string;
	signature: string | null;
	detail: string;
	insert: string;
	caretBack: number;
}

function suggestionOf(node: ApiNode): Suggestion {
	const takesArguments = node.kind === "method" && node.signature !== "()";

	return {
		label: node.name,
		signature: node.signature,
		detail: node.detail,
		insert: node.kind === "method" ? `${node.name}()` : node.name,
		caretBack: takesArguments ? 1 : 0,
	};
}

export interface SuggestionContext {
	partial: string;
	items: Suggestion[];
}

export interface SuggestionSource {
	responseBody?: string | null;
	declaredBody?: string | null;
	variableNames?: string[];
	requestHeaderNames?: string[];
	responseHeaderNames?: string[];
}

const TAIL_AFTER_CALL = /\)((?:\s*\.\s*[A-Za-z_$][\w$]*)*\s*\.(?:\s*[A-Za-z_$][\w$]*)?)$/;

const SPACE = /\s/;
const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[\w$]/;

interface PathOptions {
	/** `a . b` is one path in source, where `a. b` before a caret is not. */
	spaced: boolean;
	/** Whether a path may end on the dot the user has only just typed. */
	dotted: boolean;
}

/**
 * The dotted path the text ends with, or null when it ends with anything else.
 *
 * Read backwards from the end on purpose: the caret is what the answer hangs
 * on, and a scan from there is one pass over a few characters, where a regex
 * anchored to the end would be retried at every position in the whole script.
 */
function pathEndingAt(text: string, options: PathOptions): string | null {
	const spaceBefore = (from: number) => {
		let index = from;
		while (index > 0 && SPACE.test(text[index - 1])) index -= 1;

		return index;
	};

	let index = options.spaced ? spaceBefore(text.length) : text.length;
	let endsWithDot = false;

	if (options.dotted && index > 0 && text[index - 1] === ".") {
		endsWithDot = true;
		index -= 1;
	}

	const segments: string[] = [];

	for (;;) {
		const end = index;
		while (index > 0 && IDENTIFIER_PART.test(text[index - 1])) index -= 1;

		/** Digits cannot open an identifier, so `x2` reads but `2x` reads as `x`. */
		let start = index;
		while (start < end && !IDENTIFIER_START.test(text[start])) start += 1;

		if (start === end) break;

		segments.unshift(text.slice(start, end));

		if (start !== index) break;

		const dot = options.spaced ? spaceBefore(index) : index;

		if (dot === 0 || text[dot - 1] !== ".") break;

		index = options.spaced ? spaceBefore(dot - 1) : dot - 1;
	}

	if (segments.length === 0) return null;

	return endsWithDot ? `${segments.join(".")}.` : segments.join(".");
}

const QUOTES = new Set(['"', "'", "`"]);
/** Every character either kind of argument allows, narrowed per call below. */
const ARGUMENT_PART = /[\w.$-]/;
const ENV_OWNERS = new Set(["env", "environment"]);
const ENV_CALLS = new Set(["get", "set", "has", "unset"]);
const ENV_PARTIAL = /^[\w.$-]*$/;
const HEADER_SIDES = new Set(["request", "response"]);
const HEADER_CALLS = new Set(["get", "set", "has", "remove"]);
const HEADER_PARTIAL = /^[\w-]*$/;

interface TypedArgument {
	/** The call the argument belongs to, as a dotted path: `lz.env.get`. */
	callee: string;
	partial: string;
}

/** The string argument the caret sits inside, as in `lz.env.get("part`. */
function argumentEndingAt(text: string): TypedArgument | null {
	let index = text.length;
	while (index > 0 && ARGUMENT_PART.test(text[index - 1])) index -= 1;

	if (index === 0 || !QUOTES.has(text[index - 1])) return null;

	const beforeQuote = text.slice(0, index - 1);
	let open = beforeQuote.length;
	while (open > 0 && SPACE.test(beforeQuote[open - 1])) open -= 1;

	if (open === 0 || beforeQuote[open - 1] !== "(") return null;

	const callee = pathEndingAt(beforeQuote.slice(0, open - 1), { spaced: true, dotted: false });

	return callee ? { callee, partial: text.slice(index) } : null;
}

function calleeOf(text: string, closeIndex: number): string | null {
	let depth = 0;

	for (let index = closeIndex; index >= 0; index -= 1) {
		const character = text[index];

		if (character === ")") depth += 1;
		else if (character === "(") {
			depth -= 1;
			if (depth === 0) return pathEndingAt(text.slice(0, index), { spaced: true, dotted: false });
		}
	}

	return null;
}

function segmentsOf(tail: string): { path: string[]; partial: string } {
	const parts = tail
		.split(".")
		.slice(1)
		.map((part) => part.trim());
	const partial = parts.pop() ?? "";

	return { path: parts, partial };
}

function readable(value: unknown): string {
	if (value === null) return "null";
	if (Array.isArray(value)) return `array of ${value.length}`;
	if (typeof value === "object") return "object";
	if (typeof value === "string")
		return value.length > 40 ? `"${value.slice(0, 40)}…"` : `"${value}"`;
	if (typeof value === "number" || typeof value === "boolean") return String(value);

	/** Nothing else survives a JSON parse; a key the body never held reads so. */
	return "undefined";
}

function walkJson(body: string, path: string[]): unknown {
	let value: unknown;

	try {
		value = JSON.parse(body);
	} catch {
		return undefined;
	}

	for (const key of path) {
		const holder = Array.isArray(value) ? value[0] : value;

		if (!holder || typeof holder !== "object") return undefined;

		value = (holder as Record<string, unknown>)[key];
	}

	return value;
}

function jsonSuggestions(
	body: string | null | undefined,
	path: string[],
	partial: string,
): Suggestion[] {
	if (!body) return [];

	const value = walkJson(body, path);
	const holder = Array.isArray(value) ? value[0] : value;

	if (!holder || typeof holder !== "object") return [];

	return Object.entries(holder as Record<string, unknown>)
		.filter(([key]) => key.startsWith(partial))
		.slice(0, 50)
		.map(([key, held]) => ({
			label: key,
			signature: null,
			detail: readable(held),
			insert: key,
			caretBack: 0,
		}));
}

function jsonAliases(source: string, globalName: string): Set<string> {
	const pattern = new RegExp(
		String.raw`(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:${globalName}|lz)\s*\.\s*response\s*\.\s*json\s*\(\s*\)`,
		"g",
	);
	const names = new Set<string>();
	let found = pattern.exec(source);

	while (found) {
		names.add(found[1]);
		found = pattern.exec(source);
	}

	return names;
}

const KEYWORDS = new Set([
	"const",
	"let",
	"var",
	"if",
	"else",
	"for",
	"while",
	"do",
	"return",
	"function",
	"new",
	"typeof",
	"instanceof",
	"true",
	"false",
	"null",
	"undefined",
	"try",
	"catch",
	"finally",
	"throw",
	"switch",
	"case",
	"break",
	"continue",
	"of",
	"in",
	"this",
	"class",
	"extends",
	"await",
	"async",
	"delete",
	"void",
	"yield",
]);

const WORD = /[A-Za-z_$][\w$]*/g;
/** Comments and strings, so a word is only ever read out of actual code. */
const NOT_CODE = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|(["'`])(?:\\[\s\S]|(?!\1)[^\\])*\1/g;
const MAX_WORDS = 20;

function documentWords(source: string, partial: string): Suggestion[] {
	const seen = new Set<string>();

	for (const word of source.replace(NOT_CODE, " ").match(WORD) ?? []) {
		if (word === partial || KEYWORDS.has(word) || !word.startsWith(partial)) continue;

		seen.add(word);
	}

	return Array.from(seen)
		.sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase()))
		.slice(0, MAX_WORDS)
		.map((word) => ({
			label: word,
			signature: null,
			detail: "in this script",
			insert: word,
			caretBack: 0,
		}));
}

function nameSuggestions(names: string[], partial: string, detail: string): Suggestion[] {
	const wanted = partial.toLowerCase();

	return Array.from(new Set(names))
		.filter((name) => name.toLowerCase().startsWith(wanted))
		.sort((left, right) => left.localeCompare(right))
		.map((name) => ({ label: name, signature: null, detail, insert: name, caretBack: 0 }));
}

function starting(nodes: ApiNode[], partial: string): ApiNode[] {
	return nodes.filter((node) => node.name !== partial && node.name.startsWith(partial));
}

function unresolved(source: string, partial: string): Suggestion[] {
	return [...documentWords(source, partial), ...starting(COMMON_MEMBERS, partial).map(suggestionOf)];
}

function globalSuggestion(globalName: string): Suggestion {
	return {
		label: globalName,
		signature: null,
		detail: "Everything a script can reach.",
		insert: globalName,
		caretBack: 0,
	};
}

function isApiRoot(name: string, globalName: string) {
	return name === globalName || name === "lz";
}

function environmentNames(
	argument: TypedArgument,
	globalName: string,
	known: SuggestionSource,
): SuggestionContext | null {
	const parts = argument.callee.split(".");
	const root = parts.at(-3);

	if (!root || !isApiRoot(root, globalName)) return null;
	if (!ENV_OWNERS.has(parts[parts.length - 2]) || !ENV_CALLS.has(parts[parts.length - 1]))
		return null;
	if (!ENV_PARTIAL.test(argument.partial)) return null;

	return {
		partial: argument.partial,
		items: nameSuggestions(known.variableNames ?? [], argument.partial, "environment value"),
	};
}

function headerNames(
	argument: TypedArgument,
	globalName: string,
	known: SuggestionSource,
): SuggestionContext | null {
	const parts = argument.callee.split(".");
	const root = parts.at(-4);
	const side = (parts.at(-3) ?? "").toLowerCase();

	if (!root || !isApiRoot(root, globalName)) return null;
	if (!HEADER_SIDES.has(side) || (parts.at(-2) ?? "").toLowerCase() !== "headers") return null;
	if (!HEADER_CALLS.has((parts.at(-1) ?? "").toLowerCase())) return null;
	if (!HEADER_PARTIAL.test(argument.partial)) return null;

	const sent = side === "request";

	return {
		partial: argument.partial,
		items: nameSuggestions(
			(sent ? known.requestHeaderNames : known.responseHeaderNames) ?? [],
			argument.partial,
			sent ? "this route declares it" : "the response sent it",
		),
	};
}

/** What a chain hanging off a closed call — `lz.expect(x).` — can offer. */
function afterCallSuggestions(
	before: string,
	source: string,
	globalName: string,
	shapeBody: string | null,
): SuggestionContext | null {
	const afterCall = TAIL_AFTER_CALL.exec(before);

	if (!afterCall) return null;

	const callee = calleeOf(before, before.length - afterCall[1].length - 1);
	const { path, partial } = segmentsOf(afterCall[1]);

	if (callee && isApiRoot(callee.split(".")[0], globalName)) {
		if (/(^|\.)expect$/.test(callee)) {
			return { partial, items: starting(MATCHERS, partial).map(suggestionOf) };
		}

		if (callee.endsWith(".response.json")) {
			const shape = jsonSuggestions(shapeBody, path, partial);

			return { partial, items: shape.length > 0 ? shape : unresolved(source, partial) };
		}
	}

	return { partial, items: unresolved(source, partial) };
}

/** Nothing typed yet but a name: the global itself, plus what is in scope. */
function rootSuggestions(source: string, partial: string, globalName: string): SuggestionContext {
	const named =
		globalName.startsWith(partial) && partial !== globalName ? [globalSuggestion(globalName)] : [];

	return {
		partial,
		items: [
			...named,
			...documentWords(source, partial),
			...starting(JS_GLOBALS, partial).map(suggestionOf),
		],
	};
}

function pathSuggestions(
	before: string,
	source: string,
	globalName: string,
	phase: ScriptPhase,
	shapeBody: string | null,
): SuggestionContext | null {
	const found = pathEndingAt(before, { spaced: false, dotted: true });

	if (!found) return null;

	const endsWithDot = found.endsWith(".");
	const owner = (endsWithDot ? found.slice(0, -1) : found).split(".");
	const partial = endsWithDot ? "" : (owner.pop() ?? "");

	if (owner.length === 0) return rootSuggestions(source, partial, globalName);

	if (jsonAliases(source, globalName).has(owner[0])) {
		const shape = jsonSuggestions(shapeBody, owner.slice(1), partial);

		return { partial, items: shape.length > 0 ? shape : unresolved(source, partial) };
	}

	const standard = owner.length === 1 ? jsNamespace(owner[0]) : null;

	if (standard) {
		return { partial, items: starting(standard.members ?? [], partial).map(suggestionOf) };
	}

	if (!isApiRoot(owner[0], globalName)) {
		return { partial, items: unresolved(source, partial) };
	}

	return {
		partial,
		items: starting(membersAt(owner.slice(1), phase, catalogFor(owner[0], globalName)), partial).map(
			suggestionOf,
		),
	};
}

export function suggestionsFor(
	source: string,
	caret: number,
	globalName: string,
	phase: ScriptPhase,
	known: SuggestionSource = {},
): SuggestionContext {
	const before = source.slice(0, caret);
	const shapeBody = known.responseBody ?? known.declaredBody ?? null;
	const argument = argumentEndingAt(before);

	return (
		(argument && environmentNames(argument, globalName, known)) ??
		(argument && headerNames(argument, globalName, known)) ??
		afterCallSuggestions(before, source, globalName, shapeBody) ??
		pathSuggestions(before, source, globalName, phase, shapeBody) ?? { partial: "", items: [] }
	);
}
