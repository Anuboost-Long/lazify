import { pollUntil } from "../cancellation";
import { AssertionFailure } from "../errors";
import { describeSelector, readSelector, SELECTOR_FIELDS } from "../flow/read-selector";
import { readNumber, rejectUnknownKeys } from "../flow/read-values";
import type { ElementSelector } from "../types";
import { defineStep, type StepContext, type StepFactory } from "./definition";

interface VisibilityParams {
	selector: ElementSelector;
	timeoutMs: number;
}

function waitForVisibility(
	params: VisibilityParams,
	context: StepContext,
	expected: boolean,
): Promise<boolean> {
	return pollUntil(
		async () => (await context.driver.isVisible(params.selector)) === expected,
		params.timeoutMs || context.defaultTimeoutMs,
		context.signal,
	);
}

function visibilityStep(
	kind: string,
	expected: boolean,
	verb: string,
	failure: (target: string) => string,
): StepFactory {
	return defineStep<VisibilityParams>({
		kind,
		capabilities: ["visibility"] as const,
		parse(fields, where) {
			rejectUnknownKeys(fields, [...SELECTOR_FIELDS, "timeoutMs"], where);

			return {
				selector: readSelector(fields, where),
				timeoutMs: readNumber(fields, "timeoutMs", where, 0),
			};
		},
		describe(params) {
			return `${verb} ${describeSelector(params.selector)}`;
		},
		async execute(params, context) {
			const met = await waitForVisibility(params, context, expected);
			if (!met) throw new AssertionFailure(failure(describeSelector(params.selector)));
		},
	});
}

export const waitForStep = visibilityStep(
	"waitFor",
	true,
	"Wait for",
	(target) => `${target} never appeared`,
);

export const expectVisibleStep = visibilityStep(
	"expectVisible",
	true,
	"Expect visible",
	(target) => `${target} is not visible`,
);

export const expectNotVisibleStep = visibilityStep(
	"expectNotVisible",
	false,
	"Expect not visible",
	(target) => `${target} is still visible`,
);
