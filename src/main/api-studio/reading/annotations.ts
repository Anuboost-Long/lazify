import type { AnnotationSyntax } from "../rules/types";

export interface Annotation {
	name: string;
	args: string[];
}

export function splitTopLevel(text: string, separator: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let quote: string | null = null;
	let start = 0;

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];

		if (quote) {
			if (character === "\\" && quote !== "`") index += 1;
			else if (character === quote) quote = null;
			continue;
		}

		if (character === '"' || character === "'" || character === "`") quote = character;
		else if ("([{<".includes(character)) depth += 1;
		else if (")]}>".includes(character)) depth -= 1;
		else if (character === separator && depth === 0) {
			parts.push(text.slice(start, index));
			start = index + 1;
		}
	}

	parts.push(text.slice(start));

	return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

export function bracketBalance(text: string): number {
	let balance = 0;
	let quote: string | null = null;

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];

		if (quote) {
			if (character === "\\" && quote !== "`") index += 1;
			else if (character === quote) quote = null;
			continue;
		}

		if (character === '"' || character === "'" || character === "`") quote = character;
		else if (character === "[" || character === "(") balance += 1;
		else if (character === "]" || character === ")") balance -= 1;
	}

	return balance;
}

/** How deep the scan is inside the brackets it is collecting, and what it has. */
interface BlockScan {
	text: string;
	open: string;
	close: string;
	depth: number;
	start: number;
	blocks: string[];
}

function trackDepth(scan: BlockScan, character: string, index: number): void {
	if (character === scan.open) {
		if (scan.depth === 0) scan.start = index + 1;
		scan.depth += 1;
		return;
	}

	if (character !== scan.close) return;

	scan.depth -= 1;

	if (scan.depth === 0 && scan.start !== -1) scan.blocks.push(scan.text.slice(scan.start, index));
}

function readEnclosedBlocks(text: string, open: string, close: string): string[] {
	const scan: BlockScan = { text, open, close, depth: 0, start: -1, blocks: [] };
	let quote: string | null = null;

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index];

		if (quote) {
			if (character === "\\" && quote !== "`") index += 1;
			else if (character === quote) quote = null;
			continue;
		}

		if (character === '"' || character === "'" || character === "`") {
			quote = character;
			continue;
		}

		trackDepth(scan, character, index);
	}

	return scan.blocks;
}

function toAnnotation(entry: string): Annotation {
	const openParen = entry.indexOf("(");

	if (openParen === -1) return { name: entry.trim(), args: [] };

	return {
		name: entry.slice(0, openParen).trim(),
		args: splitTopLevel(entry.slice(openParen + 1, entry.lastIndexOf(")")), ","),
	};
}

function readDecorators(text: string): Annotation[] {
	const annotations: Annotation[] = [];
	const pattern = /@([A-Za-z_$][\w$.]*)\s*(\()?/g;

	for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
		if (!match[2]) {
			annotations.push({ name: match[1], args: [] });
			continue;
		}

		const [block] = readEnclosedBlocks(text.slice(match.index + match[0].length - 1), "(", ")");
		annotations.push({ name: match[1], args: block === undefined ? [] : splitTopLevel(block, ",") });
	}

	return annotations;
}

export function readAnnotations(text: string, syntax: AnnotationSyntax): Annotation[] {
	if (syntax === "decorator") return readDecorators(text);

	return readEnclosedBlocks(text, "[", "]").flatMap((block) =>
		splitTopLevel(block, ",").map(toAnnotation),
	);
}

export function findAnnotation(annotations: Annotation[], name: string): Annotation | null {
	return (
		annotations.find((annotation) => annotation.name.replace(/Attribute$/, "") === name) ?? null
	);
}

export function hasAnnotation(annotations: Annotation[], names: string[]): boolean {
	return names.some((name) => findAnnotation(annotations, name) !== null);
}

export function stringValue(argument: string | undefined): string | null {
	if (!argument) return null;

	const literal = argument.trim().replace(/^@/, "");
	const quote = literal[0];

	if (!quote || !`"'\``.includes(quote) || !literal.endsWith(quote)) return null;

	return literal.slice(1, -1);
}

export function namedStringValue(annotation: Annotation, name: string): string | null {
	const named = annotation.args.find((argument) => argument.trimStart().startsWith(`${name} =`));

	return named ? stringValue(named.slice(named.indexOf("=") + 1)) : null;
}

export function isAnnotationLine(text: string, syntax: AnnotationSyntax): boolean {
	return syntax === "decorator" ? text.startsWith("@") : text.startsWith("[");
}
