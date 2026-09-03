import { parseYamlDocument } from "../../api-studio/yaml";
import type { DriverCapability } from "../drivers/types";
import { FlowError } from "../errors";
import { stepFactory, supportedStepKinds, type ParsedStep } from "../steps";
import type { DiagnosticTargetKind, FlowAppId, FlowStart } from "../types";
import { asFields, readNumber, readString, rejectUnknownKeys, requireString } from "./read-values";

export interface ParsedFlow {
	name: string;
	target: DiagnosticTargetKind;
	start: FlowStart;
	appId: FlowAppId;
	steps: ParsedStep[];
	requiredSecrets: string[];
	capabilities: DriverCapability[];
}

const TOP_LEVEL_FIELDS = ["name", "target", "start", "appId", "steps"] as const;
const TARGETS: readonly DiagnosticTargetKind[] = ["web", "mobile"];

function readTarget(fields: Record<string, unknown>): DiagnosticTargetKind {
	const value = readString(fields, "target", "flow") || "web";
	if ((TARGETS as readonly string[]).includes(value)) return value as DiagnosticTargetKind;

	throw new FlowError(`"target" must be one of ${TARGETS.join(", ")}`, "flow");
}

function readStart(value: unknown): FlowStart {
	const fields = asFields(value, "start");
	rejectUnknownKeys(fields, ["script", "url", "readyTimeoutMs"], "start");

	return {
		script: readString(fields, "script", "start"),
		url: readString(fields, "url", "start"),
		readyTimeoutMs: readNumber(fields, "readyTimeoutMs", "start", 60_000),
	};
}

function readAppId(value: unknown): FlowAppId {
	const fields = asFields(value, "appId");
	rejectUnknownKeys(fields, ["android", "ios"], "appId");

	return {
		android: readString(fields, "android", "appId"),
		ios: readString(fields, "ios", "appId"),
	};
}

function readStepEntry(entry: unknown, index: number): ParsedStep {
	const where = `step ${index + 1}`;

	if (typeof entry === "string") return bindKind(entry, {}, index, `${where} (${entry})`);

	const fields = asFields(entry, where);
	const keys = Object.keys(fields);

	if (keys.length !== 1) {
		throw new FlowError("must name exactly one action", where);
	}

	return bindKind(
		keys[0],
		asFields(fields[keys[0]], `${where} (${keys[0]})`),
		index,
		`${where} (${keys[0]})`,
	);
}

function bindKind(
	kind: string,
	fields: Record<string, unknown>,
	index: number,
	where: string,
): ParsedStep {
	const factory = stepFactory(kind);
	if (!factory) {
		throw new FlowError(
			`unknown action "${kind}". Supported: ${supportedStepKinds().join(", ")}`,
			where,
		);
	}

	return factory.bind(fields, index, where);
}

function readSteps(value: unknown): ParsedStep[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new FlowError('"steps" must be a non-empty list of actions', "flow");
	}

	return value.map((entry, index) => readStepEntry(entry, index));
}

function collectSecrets(steps: ParsedStep[]): string[] {
	const names = steps
		.map((step) => step.fields.valueFrom)
		.filter((name): name is string => typeof name === "string" && name.length > 0);

	return Array.from(new Set(names));
}

function collectCapabilities(steps: ParsedStep[]): DriverCapability[] {
	return Array.from(new Set(steps.flatMap((step) => step.capabilities)));
}

export function parseFlow(text: string): ParsedFlow {
	const document = parseYamlDocument(text);
	const fields = asFields(document, "flow");

	if (Object.keys(fields).length === 0) throw new FlowError("the flow file is empty");

	rejectUnknownKeys(fields, TOP_LEVEL_FIELDS, "flow");

	const steps = readSteps(fields.steps);

	return {
		name: requireString(fields, "name", "flow"),
		target: readTarget(fields),
		start: readStart(fields.start),
		appId: readAppId(fields.appId),
		steps,
		requiredSecrets: collectSecrets(steps),
		capabilities: collectCapabilities(steps),
	};
}
