import { FlowError } from "../errors";
import { describeSelector, readSelector, SELECTOR_FIELDS } from "../flow/read-selector";
import { readString, rejectUnknownKeys } from "../flow/read-values";
import { defineStep } from "./definition";

export const inputStep = defineStep({
	kind: "input",
	capabilities: ["input"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, [...SELECTOR_FIELDS, "value", "valueFrom"], where);

		const value = readString(fields, "value", where);
		const valueFrom = readString(fields, "valueFrom", where);

		if (!value && !valueFrom) throw new FlowError('needs a "value" or a "valueFrom"', where);
		if (value && valueFrom) {
			throw new FlowError('takes a "value" or a "valueFrom", not both', where);
		}

		return { selector: readSelector(fields, where), value, valueFrom };
	},
	describe(params) {
		const what = params.valueFrom || `"${params.value}"`;
		return `Enter ${what} into ${describeSelector(params.selector)}`;
	},
	execute(params, context) {
		const value = params.valueFrom ? context.secret(params.valueFrom) : params.value;
		return context.driver.input(params.selector, value);
	},
});

export const clearInputStep = defineStep({
	kind: "clearInput",
	capabilities: ["clearInput"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, SELECTOR_FIELDS, where);
		return { selector: readSelector(fields, where) };
	},
	describe(params) {
		return `Clear ${describeSelector(params.selector)}`;
	},
	execute(params, context) {
		return context.driver.clearInput(params.selector);
	},
});
