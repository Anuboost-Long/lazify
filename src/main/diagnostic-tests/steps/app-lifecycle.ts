import { readBoolean, rejectUnknownKeys } from "../flow/read-values";
import { defineStep } from "./definition";

export const launchAppStep = defineStep({
	kind: "launchApp",
	capabilities: ["launch"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, ["clearState"], where);
		return { clearState: readBoolean(fields, "clearState", where) };
	},
	describe(params) {
		return params.clearState ? "Launch app with cleared state" : "Launch app";
	},
	execute(params, context) {
		return context.driver.launch({ clearState: params.clearState });
	},
});

export const stopAppStep = defineStep({
	kind: "stopApp",
	capabilities: ["stop"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, [], where);
		return {};
	},
	describe() {
		return "Stop app";
	},
	execute(_params, context) {
		return context.driver.stop();
	},
});
