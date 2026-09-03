import { FlowError } from "../errors";
import { readString, rejectUnknownKeys } from "../flow/read-values";
import { resolveUrl } from "../flow/resolve-url";
import { defineStep } from "./definition";

export const openStep = defineStep({
	kind: "open",
	capabilities: ["open"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, ["path", "url"], where);

		const path = readString(fields, "path", where);
		const url = readString(fields, "url", where);

		if (!path && !url) throw new FlowError('needs a "path" or a "url"', where);
		if (path && url) throw new FlowError('takes a "path" or a "url", not both', where);

		return { path, url };
	},
	describe(params) {
		return `Open ${params.url || params.path}`;
	},
	execute(params, context) {
		return context.driver.open(resolveUrl(context.baseUrl, params.url || params.path));
	},
});

export const backStep = defineStep({
	kind: "back",
	capabilities: ["back"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, [], where);
		return {};
	},
	describe() {
		return "Go back";
	},
	execute(_params, context) {
		return context.driver.back();
	},
});
