/**
 * Which preset a description reads like, by keyword and nothing cleverer.
 *
 * First rule that matches wins, so the order below is the priority: "fix the
 * add-user screen" is a fix, not a new feature. The user's own choice always
 * overrides this — it only ever fills in a blank.
 */

interface SuggestionRule {
	presetId: string;
	keywords: string[];
}

const RULES: SuggestionRule[] = [
	{
		presetId: "builtin-bug-fix",
		keywords: ["fix", "fixes", "bug", "broken", "breaks", "error", "crash", "regression", "fails"],
	},
	{
		presetId: "builtin-refactor",
		keywords: ["refactor", "cleanup", "clean up", "reorganize", "restructure", "tidy", "extract"],
	},
	{
		presetId: "builtin-research",
		keywords: ["investigate", "research", "compare", "find out", "evaluate", "explore", "why does"],
	},
	{
		presetId: "builtin-ui-ux",
		keywords: ["ui", "ux", "design", "layout", "styling", "screen", "modal", "animation", "theme"],
	},
	{
		presetId: "builtin-new-feature",
		keywords: ["add", "create", "implement", "support", "build", "introduce", "new"],
	},
];

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Whole words only: "address" is not "add". */
function mentions(text: string, keyword: string): boolean {
	const escaped = keyword.replace(REGEX_SPECIAL, String.raw`\$&`);

	return new RegExp(String.raw`\b${escaped}\b`, "i").test(text);
}

export function suggestPreset(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;

	const rule = RULES.find((candidate) =>
		candidate.keywords.some((keyword) => mentions(trimmed, keyword)),
	);

	return rule?.presetId ?? null;
}
