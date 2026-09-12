import { describeSelector, readSelector, SELECTOR_FIELDS } from "../flow/read-selector";
import { rejectUnknownKeys, requireString } from "../flow/read-values";
import { defineStep } from "./definition";

const FIELDS = [...SELECTOR_FIELDS, "file"] as const;

export const uploadFileStep = defineStep({
	kind: "uploadFile",
	capabilities: ["uploadFile"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, FIELDS, where);

		return {
			selector: readSelector(fields, where),
			file: requireString(fields, "file", where),
		};
	},
	describe(params) {
		return `Upload ${params.file} to ${describeSelector(params.selector)}`;
	},
	execute(params, context) {
		return context.driver.uploadFile(params.selector, context.resolveFixture(params.file));
	},
});
