import { describeSelector, readSelector, SELECTOR_FIELDS } from "../flow/read-selector";
import { asFields, rejectUnknownKeys } from "../flow/read-values";
import { defineStep } from "./definition";

export const dragDropStep = defineStep({
	kind: "dragDrop",
	capabilities: ["dragDrop"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, ["from", "to"], where);

		const fromWhere = `${where} (from)`;
		const toWhere = `${where} (to)`;
		const fromFields = asFields(fields.from, fromWhere);
		const toFields = asFields(fields.to, toWhere);

		rejectUnknownKeys(fromFields, SELECTOR_FIELDS, fromWhere);
		rejectUnknownKeys(toFields, SELECTOR_FIELDS, toWhere);

		return {
			from: readSelector(fromFields, fromWhere),
			to: readSelector(toFields, toWhere),
		};
	},
	describe(params) {
		return `Drag ${describeSelector(params.from)} to ${describeSelector(params.to)}`;
	},
	execute(params, context) {
		return context.driver.dragDrop(params.from, params.to);
	},
});
