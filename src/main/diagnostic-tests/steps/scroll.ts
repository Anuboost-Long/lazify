import { describeSelector, readSelector, SELECTOR_FIELDS } from "../flow/read-selector";
import { readChoice, readNumber, rejectUnknownKeys } from "../flow/read-values";
import type { ScrollDirection } from "../types";
import { defineStep } from "./definition";

const DIRECTIONS: readonly ScrollDirection[] = ["up", "down", "left", "right"];
const DEFAULT_AMOUNT = 400;

function hasSelectorField(fields: Record<string, unknown>): boolean {
	return SELECTOR_FIELDS.some((field) => fields[field] !== undefined);
}

export const scrollStep = defineStep({
	kind: "scroll",
	capabilities: ["scroll"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, [...SELECTOR_FIELDS, "direction", "amount"], where);

		return {
			direction: readChoice(fields, "direction", DIRECTIONS, where, "down"),
			amount: readNumber(fields, "amount", where, DEFAULT_AMOUNT),
			selector: hasSelectorField(fields) ? readSelector(fields, where) : undefined,
		};
	},
	describe(params) {
		const target = params.selector ? ` in ${describeSelector(params.selector)}` : "";
		return `Scroll ${params.direction}${target}`;
	},
	execute(params, context) {
		return context.driver.scroll(params);
	},
});
