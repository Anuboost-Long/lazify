import { delay } from "../cancellation";
import { AssertionFailure } from "../errors";
import { rejectUnknownKeys } from "../flow/read-values";
import { defineStep } from "./definition";

const SETTLE_MS = 250;

export const expectNoRuntimeErrorsStep = defineStep({
	kind: "expectNoRuntimeErrors",
	capabilities: ["runtimeErrors"] as const,
	parse(fields, where) {
		rejectUnknownKeys(fields, [], where);
		return {};
	},
	describe() {
		return "Expect no runtime errors";
	},
	async execute(_params, context) {
		await delay(SETTLE_MS, context.signal);

		const reports = context.driver.takeRuntimeErrors();
		if (reports.length === 0) return;

		const headline =
			reports.length === 1
				? reports[0].summary
				: `${reports.length} runtime errors, first: ${reports[0].summary}`;

		throw new AssertionFailure(headline, reports.map((report) => report.details).join("\n\n"));
	},
});
