import type { DiagnosticDriver, DriverCapability } from "../drivers/types";
import type { Fields } from "../flow/read-values";
import type { ArtifactRef } from "../types";

export interface StepContext {
	readonly driver: DiagnosticDriver;
	readonly baseUrl: string;
	readonly defaultTimeoutMs: number;
	readonly signal: AbortSignal;
	secret(name: string): string;
	screenshot(name: string): Promise<ArtifactRef>;
}

export interface ParsedStep {
	readonly kind: string;
	readonly index: number;
	readonly description: string;
	readonly capabilities: readonly DriverCapability[];
	readonly fields: Fields;
	run(context: StepContext): Promise<void>;
}

export interface StepBlueprint<Params> {
	readonly kind: string;
	readonly capabilities: readonly DriverCapability[];
	parse(fields: Fields, where: string): Params;
	describe(params: Params): string;
	execute(params: Params, context: StepContext): Promise<void>;
}

export interface StepFactory {
	readonly kind: string;
	readonly capabilities: readonly DriverCapability[];
	bind(fields: Fields, index: number, where: string): ParsedStep;
}

export function defineStep<Params>(blueprint: StepBlueprint<Params>): StepFactory {
	return {
		kind: blueprint.kind,
		capabilities: blueprint.capabilities,
		bind(fields, index, where) {
			const params = blueprint.parse(fields, where);

			return {
				kind: blueprint.kind,
				index,
				description: blueprint.describe(params),
				capabilities: blueprint.capabilities,
				fields,
				run: (context) => blueprint.execute(params, context),
			};
		},
	};
}
