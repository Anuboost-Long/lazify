import type { ProjectSearchMatch } from "./types";

const MAX_PREVIEW_LENGTH = 240;
const PREVIEW_LEAD = 20;

function clipPreview(line: string, start: number, end: number) {
	const indent = line.length - line.trimStart().length;
	const offset = start - indent > PREVIEW_LEAD ? start - PREVIEW_LEAD : Math.min(indent, start);
	const preview = line.slice(offset, offset + MAX_PREVIEW_LENGTH);

	return {
		preview,
		start: start - offset,
		end: Math.min(end - offset, preview.length),
	};
}

export function matchLines(
	contents: string,
	pattern: RegExp,
	budget: number,
): ProjectSearchMatch[] {
	const matches: ProjectSearchMatch[] = [];
	const lines = contents.split("\n");

	for (let index = 0; index < lines.length && matches.length < budget; index += 1) {
		const line = lines[index].replace(/\r$/, "");
		pattern.lastIndex = 0;

		let hit = pattern.exec(line);

		while (hit && matches.length < budget) {
			matches.push({
				line: index + 1,
				...clipPreview(line, hit.index, hit.index + hit[0].length),
			});

			if (hit[0].length === 0) pattern.lastIndex += 1;
			hit = pattern.exec(line);
		}
	}

	return matches;
}
