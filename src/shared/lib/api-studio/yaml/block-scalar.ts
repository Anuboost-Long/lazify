import type { YamlLine } from "./lines";

export interface BlockScalarIndicator {
	style: "|" | ">";
	chomp: "-" | "+" | "";
	explicitIndent: number;
}

function chompOf(modifiers: string): BlockScalarIndicator["chomp"] {
	if (modifiers.includes("-")) return "-";

	return modifiers.includes("+") ? "+" : "";
}

export function readBlockScalarIndicator(valueText: string): BlockScalarIndicator | null {
	const match = /^([|>])([\d+-]*)$/.exec(valueText);
	if (!match) return null;

	const modifiers = match[2];
	const digits = modifiers.replace(/[+-]/g, "");
	const chompMarker = chompOf(modifiers);

	return {
		style: match[1] as "|" | ">",
		chomp: chompMarker,
		explicitIndent: digits ? Number(digits) : 0,
	};
}

function foldLines(contentLines: string[]): string {
	return contentLines.reduce((folded, line, index) => {
		if (index === 0) return line;
		if (line.length === 0 || contentLines[index - 1].length === 0) return `${folded}\n${line}`;
		return `${folded} ${line}`;
	}, "");
}

export function readBlockScalar(
	lines: YamlLine[],
	start: number,
	parentIndent: number,
	indicator: BlockScalarIndicator,
): { value: string; nextIndex: number } {
	const collected: YamlLine[] = [];
	let index = start;

	while (index < lines.length) {
		const line = lines[index];
		if (line.structural && line.indent <= parentIndent) break;
		collected.push(line);
		index += 1;
	}

	while (collected.length > 0 && !collected[collected.length - 1].structural) collected.pop();

	const firstContentLine = collected.find((line) => line.structural);
	const contentIndent = indicator.explicitIndent
		? parentIndent + indicator.explicitIndent
		: (firstContentLine?.indent ?? parentIndent + 1);

	const contentLines = collected.map((line) =>
		line.structural ? line.raw.slice(contentIndent) : "",
	);
	const body = indicator.style === "|" ? contentLines.join("\n") : foldLines(contentLines);
	const clipped = body.replace(/(?<!\n)\n+$/, "");

	if (indicator.chomp === "-") return { value: clipped, nextIndex: index };
	if (indicator.chomp === "+") return { value: body, nextIndex: index };

	return { value: clipped.length > 0 ? `${clipped}\n` : "", nextIndex: index };
}
