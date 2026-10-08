export type ContextTypeId = "rule" | "fact" | "command" | "path";

/** Where a type's line lands in the prompt. */
export type ContextSection = "context" | "rules";

export type ContextPayload = Record<string, string>;

/** How one kind of context turns into the line it contributes to a prompt. */
export interface ContextRenderer {
	section: ContextSection;
	render: (payload: ContextPayload) => string;
}

export function field(payload: ContextPayload, name: string): string {
	return (payload[name] ?? "").trim();
}

/** Sentence-cases a fragment the user typed in the middle of a phrase. */
export function sentence(text: string): string {
	if (!text) return "";
	return text[0].toUpperCase() + text.slice(1);
}

/** Trims a trailing full stop so a rendered line can add its own punctuation. */
export function bare(text: string): string {
	let trimmed = text.trimEnd();
	while (trimmed.endsWith(".")) trimmed = trimmed.slice(0, -1).trimEnd();

	return trimmed;
}

/**
 * The enforced kind: what to do, how strongly, when, and why.
 *
 * Renders as one line — `Use Yarn instead of npm (required), when installing
 * dependencies — the repo has yarn.lock.` — so the instruction, its force and
 * its scope can never be read as each other.
 */
export const ruleRenderer: ContextRenderer = {
	section: "rules",
	render: (payload) => {
		const action = bare(field(payload, "action"));
		if (!action) return "";

		const strength = field(payload, "strength") || "required";
		const condition = bare(field(payload, "condition"));
		const reason = bare(field(payload, "reason"));

		const scope = condition ? `, when ${condition}` : "";
		const why = reason ? ` — ${reason}` : "";

		return `${sentence(action)} (${strength})${scope}${why}.`;
	},
};

/** What the project is: `Framework: Next.js`. */
export const factRenderer: ContextRenderer = {
	section: "context",
	render: (payload) => {
		const key = bare(field(payload, "key"));
		const value = bare(field(payload, "value"));

		if (!key || !value) return "";

		return `${sentence(key)}: ${value}`;
	},
};

/**
 * How something is run here: `To run the tests: yarn test`.
 *
 * Separate from a rule because it answers "how", not "must". An agent that
 * guesses the test command wastes a run finding out it was wrong.
 */
export const commandRenderer: ContextRenderer = {
	section: "context",
	render: (payload) => {
		const purpose = bare(field(payload, "purpose"));
		const command = bare(field(payload, "command"));

		if (!purpose || !command) return "";

		return `To ${purpose}: \`${command}\``;
	},
};

/** Where something lives: `src/services — API clients`. */
export const pathRenderer: ContextRenderer = {
	section: "context",
	render: (payload) => {
		const location = bare(field(payload, "path"));
		const holds = bare(field(payload, "holds"));

		if (!location || !holds) return "";

		return `${location} — ${holds}`;
	},
};

const RENDERERS = new Map<string, ContextRenderer>([
	["rule", ruleRenderer],
	["fact", factRenderer],
	["command", commandRenderer],
	["path", pathRenderer],
]);

/** An unknown type is read as a rule, as the picker's fallback does. */
export function contextRenderer(id: string): ContextRenderer {
	return RENDERERS.get(id) ?? ruleRenderer;
}

/** The single line an entry contributes to a prompt. */
export function renderContext(id: string, payload: ContextPayload): string {
	return contextRenderer(id).render(payload);
}
