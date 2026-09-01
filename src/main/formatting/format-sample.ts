import prettier from "prettier";

import type { FormatterDefaults } from "./types";

/**
 * The fallback rules applied to a fixed snippet, so the settings page can show
 * what they do rather than describe it.
 *
 * The snippet is chosen to exercise every option on that page at once: it has a
 * line long enough to wrap, a nested object, a string, a statement end and a
 * list that can take a trailing comma. Change an option and something visibly
 * moves.
 */
const SAMPLE = `const config = {name: "lazify", tags: ["editor", "agents", "api"], retries: 3}
export function describe(project, options) {
if (!project) { return null }
return {...config, ...options, label: \`\${project.name} (\${project.stack})\`}
}
`;

export async function formatSample(defaults: FormatterDefaults): Promise<string> {
	try {
		return await prettier.format(SAMPLE, { ...defaults, parser: "typescript" });
	} catch {
		return SAMPLE;
	}
}
