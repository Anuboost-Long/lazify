import { placeholderFor, readDeclaredType } from "../body-template/placeholders";
import {
	findAnnotation,
	namedStringValue,
	readAnnotations,
	splitTopLevel,
	stringValue,
	type Annotation,
} from "../reading/annotations";
import type { AnnotationRules, FrameworkRules } from "../rules/types";
import type { ApiBody, ApiHeader, ApiParameter } from "../types";

export interface BoundParameters {
	parameters: ApiParameter[];
	headers: ApiHeader[];
	requestBody: ApiBody | null;
}

interface SignatureArgument {
	type: string;
	name: string;
	optional: boolean;
	annotations: Annotation[];
}

export function schemaTypeOf(type: string, types: Record<string, string>): string {
	const collection = /^(?:List|IEnumerable|ICollection|IList|IReadOnlyList|Array)<(.+)>$/.exec(type);
	if (collection) return `array<${schemaTypeOf(collection[1].trim(), types)}>`;
	if (type.endsWith("[]")) return `array<${schemaTypeOf(type.slice(0, -2), types)}>`;

	const bare = type.replace(/\?$/, "").replace(/^System\./, "");

	return types[bare.toLowerCase()] ?? bare;
}

/** `[FromQuery] string? q = ""` and `@Query('q') q?: string` reduced to one shape. */
function readArgument(text: string, rules: AnnotationRules): SignatureArgument | null {
	const annotations = readAnnotations(text, rules.syntax);
	const declaration =
		rules.syntax === "decorator"
			? text.replace(/@[A-Za-z_$][\w$.]*\s*(\([^)]*\))?/g, " ")
			: text.replace(/\[[^[\]]+\]/g, " ");
	const [beforeDefault, ...defaultValue] = declaration.split("=");

	if (rules.syntax === "decorator") {
		const [name, ...typeParts] = beforeDefault.split(":");
		const identifier = name.trim().replace(/(?<![?.])[?.]+$/, "");

		if (!identifier) return null;

		return {
			type: typeParts.join(":").trim() || "string",
			name: identifier,
			optional: name.includes("?") || defaultValue.length > 0,
			annotations,
		};
	}

	const parts = beforeDefault
		.trim()
		.split(/\s+/)
		.filter((part) => part.length > 0 && part !== "params");

	if (parts.length < 2) return null;

	const type = parts.slice(0, -1).join(" ");

	return {
		type,
		name: parts[parts.length - 1],
		optional: defaultValue.length > 0 || type.endsWith("?"),
		annotations,
	};
}

function boundName(argument: SignatureArgument, annotation: Annotation, rules: AnnotationRules) {
	if (rules.binding.nameFrom === "annotationArgument") {
		return stringValue(annotation.args[0]) ?? argument.name;
	}

	return namedStringValue(annotation, "Name") ?? argument.name;
}

const URLENCODED = "application/x-www-form-urlencoded";
const MULTIPART = "multipart/form-data";

interface FormField {
	name: string;
	type: string;
	file: boolean;
}

/**
 * A form is a set of fields, not one model: an action may bind a DTO, a couple
 * of loose values and a file, and all of them travel in the same body.
 */
function formBody(
	model: string | null,
	fields: FormField[],
	types: Record<string, string>,
): ApiBody {
	const declared = Object.fromEntries(
		fields.map((field) => [
			field.name,
			field.file ? "" : placeholderFor(readDeclaredType(schemaTypeOf(field.type, types))),
		]),
	);

	return {
		required: true,
		description: null,
		variants: [
			{
				mediaType: fields.some((field) => field.file) ? MULTIPART : URLENCODED,
				schemaType: model ? schemaTypeOf(model, types) : null,
				example: null,
				defaultBody: fields.length > 0 ? JSON.stringify(declared, null, 2) : null,
			},
		],
	};
}

function jsonBody(type: string, types: Record<string, string>): ApiBody {
	return {
		required: true,
		description: null,
		variants: [
			{
				mediaType: "application/json",
				schemaType: schemaTypeOf(type, types),
				example: null,
				defaultBody: null,
			},
		],
	};
}

/** What the signature has bound so far, as its arguments are read left to right. */
interface BindingState {
	parameters: ApiParameter[];
	headers: ApiHeader[];
	formFields: FormField[];
	formModel: string | null;
	requestBody: ApiBody | null;
}

/** Where the argument's own annotation says its value comes from, if it says. */
function boundTarget(argument: SignatureArgument, rules: AnnotationRules) {
	return Object.entries(rules.binding.annotations)
		.map(([name, target]) => {
			const annotation = findAnnotation(argument.annotations, name);
			return annotation ? { annotation, target } : null;
		})
		.find((entry) => entry !== null);
}

type BoundEntry = ReturnType<typeof boundTarget>;

function bindFormArgument(
	argument: SignatureArgument,
	bound: BoundEntry,
	isFile: boolean,
	framework: FrameworkRules,
	rules: AnnotationRules,
	state: BindingState,
) {
	const named = bound ? boundName(argument, bound.annotation, rules) : argument.name;
	const bare = argument.type.replace(/\?$/, "").replace(/<.*/, "").toLowerCase();

	/** One form binds one model; the rest are fields, and the first one holds. */
	if (!isFile && !framework.types[bare]) state.formModel ??= argument.type;
	else state.formFields.push({ name: named, type: argument.type, file: isFile });
}

/** Nothing said where this one comes from, so its type has to answer for it. */
function bindByType(
	argument: SignatureArgument,
	framework: FrameworkRules,
	rules: AnnotationRules,
	bodyBearing: boolean,
	state: BindingState,
) {
	const bareType = argument.type.replace(/\?$/, "").toLowerCase();

	if (rules.binding.ignoredTypes.includes(bareType.replace(/<.*/, ""))) return;

	if (framework.types[bareType]) {
		state.parameters.push({
			name: argument.name,
			location: "query",
			required: !argument.optional,
			description: null,
			schemaType: schemaTypeOf(argument.type, framework.types),
			example: null,
		});
		return;
	}

	if (rules.binding.inferBodyFromModel && bodyBearing && !state.requestBody) {
		state.requestBody = jsonBody(argument.type, framework.types);
	}
}

function bindArgument(
	argument: SignatureArgument,
	framework: FrameworkRules,
	rules: AnnotationRules,
	templateNames: Set<string>,
	bodyBearing: boolean,
	state: BindingState,
) {
	const bound = boundTarget(argument, rules);

	if (bound?.target === "ignore") return;

	if (bound?.target === "header") {
		state.headers.push({
			name: boundName(argument, bound.annotation, rules),
			value: null,
			required: !argument.optional,
			description: null,
		});
		return;
	}

	if (bound?.target === "body") {
		state.requestBody = jsonBody(argument.type, framework.types);
		return;
	}

	/** `List<IFormFile>` is a file field too: the wrapper is not what it holds. */
	const isFile = argument.type
		.toLowerCase()
		.split(/[<>[\],\s]+/)
		.some((token) => rules.binding.fileTypes.includes(token.replace(/\?$/, "")));

	/** A file is part of the request wherever it appears, annotated or not. */
	if (bound?.target === "form" || isFile) {
		bindFormArgument(argument, bound, isFile, framework, rules, state);
		return;
	}

	if (bound?.target === "query" || bound?.target === "cookie") {
		state.parameters.push({
			name: boundName(argument, bound.annotation, rules),
			location: bound.target,
			required: !argument.optional,
			description: null,
			schemaType: schemaTypeOf(argument.type, framework.types),
			example: null,
		});
		return;
	}

	if (bound?.target === "path" || templateNames.has(argument.name)) return;

	bindByType(argument, framework, rules, bodyBearing, state);
}

export function bindSignature(
	signature: string,
	framework: FrameworkRules,
	templateNames: Set<string>,
	bodyBearing: boolean,
): BoundParameters {
	const rules = framework.annotations;
	const state: BindingState = {
		parameters: [],
		headers: [],
		formFields: [],
		formModel: null,
		requestBody: null,
	};

	if (!rules) return { parameters: state.parameters, headers: state.headers, requestBody: null };

	for (const argumentText of splitTopLevel(signature, ",")) {
		const argument = readArgument(argumentText, rules);
		if (!argument) continue;

		bindArgument(argument, framework, rules, templateNames, bodyBearing, state);
	}

	if (state.formFields.length > 0 || state.formModel) {
		state.requestBody = formBody(state.formModel, state.formFields, framework.types);
	}

	return { parameters: state.parameters, headers: state.headers, requestBody: state.requestBody };
}
