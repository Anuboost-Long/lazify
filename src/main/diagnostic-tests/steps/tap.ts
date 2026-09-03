import { describeSelector, readSelector, SELECTOR_FIELDS } from "../flow/read-selector";
import { rejectUnknownKeys } from "../flow/read-values";
import { defineStep } from "./definition";

export const tapStep = defineStep({
	kind: "tap",
	capabilities: ["tap"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, SELECTOR_FIELDS, where);
		return { selector: readSelector(fields, where) };
	},
	describe(params) {
		return `Tap ${describeSelector(params.selector)}`;
	},
	execute(params, context) {
		return context.driver.tap(params.selector);
	},
});
