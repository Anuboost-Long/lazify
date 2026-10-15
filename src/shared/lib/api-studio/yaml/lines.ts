import { unquote } from "./scalars";

export interface YamlLine {
	number: number;
	indent: number;
	raw: string;
	text: string;
	structural: boolean;
}

export function stripComment(content: string): string {
	let quote: string | null = null;

	for (let index = 0; index < content.length; index += 1) {
		const character = content[index];

		if (quote) {
			if (character === "\\" && quote === '"') index += 1;
			else if (character === quote) quote = null;
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}

		if (character === "#" && (index === 0 || /\s/.test(content[index - 1]))) {
			return content.slice(0, index);
		}
	}

	return content;
}

export function readYamlLines(source: string): YamlLine[] {
	return source.split(/\r?\n/).map((raw, index) => {
		const indent = raw.length - raw.trimStart().length;

		if (raw.slice(0, indent).includes("\t")) {
			throw new Error(`Line ${index + 1}: YAML indentation must use spaces, not tabs.`);
		}

		const text = stripComment(raw.slice(indent)).trimEnd();

		return { number: index + 1, indent, raw, text, structural: text.length > 0 };
	});
}

export function nextStructuralIndex(lines: YamlLine[], from: number): number {
	let index = from;
	while (index < lines.length && !lines[index].structural) index += 1;
	return index;
}

export function isSequenceItem(text: string): boolean {
	return text === "-" || text.startsWith("- ");
}

const QUOTES = new Set(['"', "'"]);
const FLOW_OPENERS = new Set(["[", "{"]);
const FLOW_CLOSERS = new Set(["]", "}"]);

/** A colon separates a key from a value only when a space or the line end follows. */
function isSeparator(text: string, index: number): boolean {
	const following = text[index + 1];

	return following === undefined || following === " ";
}

function keyAt(text: string, index: number): { key: string; valueText: string } | null {
	const rawKey = text.slice(0, index).trim();

	if (rawKey.length === 0) return null;

	return { key: unquote(rawKey) ?? rawKey, valueText: text.slice(index + 1).trim() };
}

function depthAfter(character: string, depth: number): number {
	if (FLOW_OPENERS.has(character)) return depth + 1;

	return FLOW_CLOSERS.has(character) ? depth - 1 : depth;
}

export function splitMappingKey(text: string): { key: string; valueText: string } | null {
	let quote: string | null = null;
	let depth = 0;

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];

		if (quote) {
			if (character === "\\" && quote === '"') index += 1;
			else if (character === quote) quote = null;
			continue;
		}

		if (QUOTES.has(character)) {
			quote = character;
			continue;
		}

		depth = depthAfter(character, depth);

		if (character === ":" && depth === 0 && isSeparator(text, index)) return keyAt(text, index);
	}

	return null;
}
