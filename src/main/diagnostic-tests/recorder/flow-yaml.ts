import { parseFlow } from "../flow/parse-flow";
import type { ElementSelector } from "../types";
import type { RecordedStep } from "./recorded-step";

const AWKWARD_EDGES = /^[\s-]|\s$|^$/;
const YAML_PUNCTUATION = /[:#]/;
const RESERVED_WORD = /^(?:true|false|null|~)$/i;
const NUMERIC = /^-?\d+(?:\.\d+)?$/;

function scalar(value: string): string {
	const risky =
		AWKWARD_EDGES.test(value) ||
		YAML_PUNCTUATION.test(value) ||
		RESERVED_WORD.test(value) ||
		NUMERIC.test(value);

	return risky ? JSON.stringify(value) : value;
}

function selectorLines(selector: ElementSelector, indent = "    "): string[] {
	const lines: string[] = [];

	if (selector.id) lines.push(`${indent}id: ${scalar(selector.id)}`);
	if (selector.label) lines.push(`${indent}label: ${scalar(selector.label)}`);
	if (selector.role) lines.push(`${indent}role: ${scalar(selector.role)}`);
	if (selector.name) lines.push(`${indent}name: ${scalar(selector.name)}`);
	if (selector.text) lines.push(`${indent}text: ${scalar(selector.text)}`);

	return lines;
}

function pathOf(url: string, baseUrl: string): string {
	try {
		const target = new URL(url);
		if (!baseUrl) return target.toString();

		const base = new URL(baseUrl);
		if (base.origin !== target.origin) return target.toString();

		return `${target.pathname}${target.search}` || "/";
	} catch {
		return url;
	}
}

function stepLines(step: RecordedStep, baseUrl: string): string[] {
	if (step.kind === "open") {
		return [" - open:", `    path: ${scalar(pathOf(step.url ?? "/", baseUrl))}`];
	}

	const selector = selectorLines(step.selector ?? {});

	if (step.kind === "input") {
		const value = step.valueFrom
			? `    valueFrom: ${scalar(step.valueFrom)}`
			: `    value: ${scalar(step.value ?? "")}`;

		return [" - input:", ...selector, value];
	}

	if (step.kind === "dragDrop") {
		const from = selectorLines(step.selector ?? {}, "      ");
		const target = selectorLines(step.targetSelector ?? {}, "      ");

		return [" - dragDrop:", "    from:", ...from, "    to:", ...target];
	}

	if (step.kind === "uploadFile") {
		return [" - uploadFile:", ...selector, `    file: ${scalar(step.file ?? "")}`];
	}

	return [` - ${step.kind}:`, ...selector];
}

export interface RecordedFlow {
	name: string;
	baseUrl: string;
	steps: RecordedStep[];
}

export function toFlowYaml(flow: RecordedFlow): string {
	const header = [`name: ${scalar(flow.name)}`, "target: web"];
	const start = flow.baseUrl ? ["start:", ` url: ${scalar(flow.baseUrl)}`] : [];
	const steps = flow.steps.flatMap((step) => stepLines(step, flow.baseUrl));

	const text = [...header, ...start, "steps:", ...steps].join("\n");

	return `${text}\n`;
}

export function toValidatedFlowYaml(flow: RecordedFlow): string {
	const text = toFlowYaml(flow);

	parseFlow(text);

	return text;
}
