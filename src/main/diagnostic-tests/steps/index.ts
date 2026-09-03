import { launchAppStep, stopAppStep } from "./app-lifecycle";
import type { StepFactory } from "./definition";
import { expectUrlStep } from "./expect-url";
import { backStep, openStep } from "./navigation";
import { expectNoRuntimeErrorsStep } from "./runtime-errors";
import { screenshotStep } from "./screenshot";
import { scrollStep } from "./scroll";
import { tapStep } from "./tap";
import { clearInputStep, inputStep } from "./text-input";
import { expectNotVisibleStep, expectVisibleStep, waitForStep } from "./visibility";

const FACTORIES: readonly StepFactory[] = [
	launchAppStep,
	stopAppStep,
	openStep,
	tapStep,
	inputStep,
	clearInputStep,
	scrollStep,
	backStep,
	waitForStep,
	expectVisibleStep,
	expectNotVisibleStep,
	expectUrlStep,
	expectNoRuntimeErrorsStep,
	screenshotStep,
];

const BY_KIND = new Map(FACTORIES.map((factory) => [factory.kind, factory]));

export function stepFactory(kind: string): StepFactory | undefined {
	return BY_KIND.get(kind);
}

export function supportedStepKinds(): string[] {
	return FACTORIES.map((factory) => factory.kind);
}

export type { ParsedStep, StepContext, StepFactory } from "./definition";
