import { builtinModules } from "node:module";
import path from "node:path";

const ORGANIZABLE = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);

const BUILTINS = new Set(builtinModules);

const STARTS_IMPORT = /^\s*import\s+(?![(=])/;
const COMPLETE = /\bfrom\s*(['"])([^'"]+)\1\s*(?:;\s*)?(\/\/.*)?$/;
const SIDE_EFFECT = /^\s*import\s*(['"])([^'"]+)\1\s*(?:;\s*)?(\/\/.*)?$/;
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;
const DIRECTIVE = /^\s*(['"])use [a-z ]+\1\s*(?:;\s*)?$/;

const MAX_STATEMENT_LINES = 60;

interface ImportStatement {
	text: string;
	specifier: string;
	sideEffect: boolean;
	order: number;
}

function specifierOf(text: string): { specifier: string; sideEffect: boolean } | null {
	const sideEffect = SIDE_EFFECT.exec(text);
	if (sideEffect) return { specifier: sideEffect[2], sideEffect: true };

	const named = COMPLETE.exec(text);

	return named ? { specifier: named[2], sideEffect: false } : null;
}

function statementEnd(lines: string[], start: number): number | null {
	let joined = "";

	for (let index = start; index < lines.length; index += 1) {
		if (index - start >= MAX_STATEMENT_LINES) return null;

		joined += index === start ? lines[index] : `\n${lines[index]}`;

		if (SIDE_EFFECT.test(joined) || COMPLETE.test(joined)) return index;
	}

	return null;
}

function groupRank(specifier: string, aliasPrefixes: string[]): number {
	if (specifier.startsWith("node:") || BUILTINS.has(specifier.split("/")[0])) return 0;
	if (specifier.startsWith(".")) return 3;
	if (aliasPrefixes.some((prefix) => specifier.startsWith(prefix))) return 2;

	return 1;
}

function upwardSteps(specifier: string): number {
	return specifier.split("/").filter((part) => part === "..").length;
}

function compare(left: ImportStatement, right: ImportStatement): number {
	const byDepth = upwardSteps(right.specifier) - upwardSteps(left.specifier);
	if (byDepth !== 0) return byDepth;

	const leftName = left.specifier.toLowerCase();
	const rightName = right.specifier.toLowerCase();

	if (leftName < rightName) return -1;
	if (leftName > rightName) return 1;

	return left.order - right.order;
}

function sortedBlock(statements: ImportStatement[], aliasPrefixes: string[]): string {
	const groups = new Map<number, ImportStatement[]>();

	statements.forEach((statement) => {
		const rank = groupRank(statement.specifier, aliasPrefixes);
		groups.set(rank, [...(groups.get(rank) ?? []), statement]);
	});

	return [...groups.entries()]
		.sort(([left], [right]) => left - right)
		.map(([, entries]) =>
			[...entries]
				.sort(compare)
				.map((statement) => statement.text)
				.join("\n"),
		)
		.join("\n\n");
}

function rebuild(statements: ImportStatement[], aliasPrefixes: string[]): string {
	const blocks: string[] = [];
	let pending: ImportStatement[] = [];

	const flush = () => {
		if (pending.length > 0) blocks.push(sortedBlock(pending, aliasPrefixes));
		pending = [];
	};

	statements.forEach((statement) => {
		if (!statement.sideEffect) {
			pending.push(statement);
			return;
		}

		flush();
		blocks.push(statement.text);
	});

	flush();

	return blocks.join("\n");
}

/** Where the next import statement could begin, or why the block has ended. */
type Scan = { kind: "skip"; next: number } | { kind: "stop" } | { kind: "statement"; head: number };

/** The first line after the comment lines leading whatever sits at `cursor`. */
function headOf(lines: string[], cursor: number): number {
	let head = cursor;

	while (head < lines.length && COMMENT_LINE.test(lines[head])) head += 1;

	return head;
}

function nextStatement(lines: string[], cursor: number, inBlock: boolean): Scan {
	const line = lines[cursor];

	if (line.trim() === "" || (!inBlock && DIRECTIVE.test(line))) {
		return { kind: "skip", next: cursor + 1 };
	}

	const head = headOf(lines, cursor);

	if (head >= lines.length) return { kind: "stop" };

	/** Comments followed by a blank line lead nothing, so they are not the block's. */
	if (head > cursor && lines[head].trim() === "") {
		return inBlock ? { kind: "stop" } : { kind: "skip", next: head };
	}

	return { kind: "statement", head };
}

/** The import statement starting at `head`, or null when it is not one to move. */
function statementAt(lines: string[], head: number) {
	if (!STARTS_IMPORT.test(lines[head])) return null;

	const end = statementEnd(lines, head);

	if (end === null) return null;

	const parsed = specifierOf(lines.slice(head, end + 1).join("\n"));

	return parsed ? { end, parsed } : null;
}

export function isOrganizable(filePath: string): boolean {
	return ORGANIZABLE.has(path.extname(filePath).toLowerCase());
}

export function organizeImports(source: string, filePath: string, aliasPrefixes: string[]): string {
	if (!isOrganizable(filePath)) return source;

	const lines = source.split("\n");
	const statements: ImportStatement[] = [];

	let cursor = 0;
	let blockStart = -1;
	let blockEnd = -1;

	while (cursor < lines.length) {
		const scan = nextStatement(lines, cursor, blockStart !== -1);

		if (scan.kind === "stop") break;

		if (scan.kind === "skip") {
			cursor = scan.next;
			continue;
		}

		const statement = statementAt(lines, scan.head);

		if (!statement) break;

		if (blockStart === -1) blockStart = cursor;

		statements.push({
			text: lines.slice(cursor, statement.end + 1).join("\n"),
			...statement.parsed,
			order: statements.length,
		});

		blockEnd = statement.end;
		cursor = statement.end + 1;
	}

	if (statements.length < 2) return source;

	const organized = rebuild(statements, aliasPrefixes);
	const original = lines.slice(blockStart, blockEnd + 1).join("\n");

	if (organized === original) return source;

	return [...lines.slice(0, blockStart), organized, ...lines.slice(blockEnd + 1)].join("\n");
}
