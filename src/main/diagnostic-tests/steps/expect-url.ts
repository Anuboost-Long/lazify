import { pollUntil } from "../cancellation";
import { AssertionFailure, FlowError } from "../errors";
import { readString, rejectUnknownKeys } from "../flow/read-values";
import { resolveUrl } from "../flow/resolve-url";
import { defineStep, type StepContext } from "./definition";

interface UrlExpectation {
	equals: string;
	contains: string;
	matches: string;
}

function matcher(params: UrlExpectation, baseUrl: string): (url: string) => boolean {
	if (params.equals) {
		const expected = resolveUrl(baseUrl, params.equals);
		return (url) => url === expected;
	}

	if (params.contains) return (url) => url.includes(params.contains);

	const pattern = new RegExp(params.matches);
	return (url) => pattern.test(url);
}

async function assertUrl(params: UrlExpectation, context: StepContext): Promise<void> {
	const matches = matcher(params, context.baseUrl);
	let seen = "";

	const met = await pollUntil(
		async () => {
			seen = await context.driver.currentUrl();
			return matches(seen);
		},
		context.defaultTimeoutMs,
		context.signal,
	);

	if (!met)
		throw new AssertionFailure(`Url is ${seen || "unknown"}`, `Expected ${describe(params)}`);
}

function describe(params: UrlExpectation): string {
	if (params.equals) return `url ${params.equals}`;
	if (params.contains) return `url containing ${params.contains}`;

	return `url matching /${params.matches}/`;
}

export const expectUrlStep = defineStep<UrlExpectation>({
	kind: "expectUrl",
	capabilities: ["url"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, ["equals", "contains", "matches"], where);

		const params = {
			equals: readString(fields, "equals", where),
			contains: readString(fields, "contains", where),
			matches: readString(fields, "matches", where),
		};

		const given = Object.values(params).filter(Boolean);
		if (given.length === 0) throw new FlowError('needs "equals", "contains" or "matches"', where);
		if (given.length > 1) throw new FlowError("takes only one comparison", where);

		if (params.matches) {
			try {
				new RegExp(params.matches);
			} catch {
				throw new FlowError(`"matches" is not a valid regular expression`, where);
			}
		}

		return params;
	},
	describe(params) {
		return `Expect ${describe(params)}`;
	},
	execute: assertUrl,
});
