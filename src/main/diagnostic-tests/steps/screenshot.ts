import { requireString, rejectUnknownKeys } from "../flow/read-values";
import { defineStep } from "./definition";

export const screenshotStep = defineStep({
	kind: "screenshot",
	capabilities: ["screenshot"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, ["name"], where);
		return { name: requireString(fields, "name", where) };
	},
	describe(params) {
		return `Screenshot ${params.name}`;
	},
	async execute(params, context) {
		await context.screenshot(params.name);
	},
});
