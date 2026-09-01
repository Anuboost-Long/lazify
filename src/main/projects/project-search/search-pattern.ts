import type { ProjectSearchQuery } from "./types";

const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

export function escapeRegex(value: string) {
	return value.replace(REGEX_SPECIAL_CHARACTERS, String.raw`\$&`);
}

export function buildSearchPattern(query: ProjectSearchQuery): RegExp {
	const source = query.useRegex ? query.query : escapeRegex(query.query);
	const bounded = query.wholeWord ? String.raw`\b(?:${source})\b` : source;

	return new RegExp(bounded, query.matchCase ? "g" : "gi");
}
