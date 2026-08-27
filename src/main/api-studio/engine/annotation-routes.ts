import {
	bracketBalance,
	findAnnotation,
	hasAnnotation,
	isAnnotationLine,
	readAnnotations,
	stringValue,
	type Annotation,
} from "../reading/annotations";
import {
	readBaseTypes,
	readClassName,
	readDocSummary,
	readMethodDeclaration,
	type MethodDeclaration,
} from "../reading/declarations";
import type { AnnotationRules, FrameworkRules } from "../rules/types";
import type { HttpMethod, RouteSecurity } from "../types";
import { bindSignature } from "./parameter-binding";
import {
	combineTemplates,
	substituteTokens,
	templateParameters,
	toCanonicalPath,
} from "./path-template";
import type { FrameworkFileScan, FrameworkRouteDraft } from "./route-drafts";

const BODY_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH"]);

interface Container {
	name: string;
	template: string | null;
	security: RouteSecurity[];
	anonymous: boolean;
}

function templateOf(annotations: Annotation[], names: string[]): string | null {
	for (const name of names) {
		const annotation = findAnnotation(annotations, name);
		const template = annotation ? stringValue(annotation.args[0]) : null;

		if (template !== null) return template;
	}

	return null;
}

function hasDeclaredScheme(annotations: Annotation[], rules: AnnotationRules): boolean {
	return rules.auth.schemes.some((scheme) => hasAnnotation(annotations, scheme.annotations));
}

function securityOf(
	annotations: Annotation[],
	rules: AnnotationRules,
	fromContainer: RouteSecurity[],
): RouteSecurity[] {
	if (hasAnnotation(annotations, rules.auth.anonymous)) return [];

	const declared = rules.auth.schemes.flatMap((scheme) => {
		const annotation = scheme.annotations
			.map((name) => findAnnotation(annotations, name))
			.find((found) => found !== null);

		if (!annotation) return [];

		return [
			{
				kind: scheme.kind,
				schemeName: annotation.name,
				location: scheme.location,
				parameterName:
					(scheme.nameFromArgument ? stringValue(annotation.args[0]) : null) ?? scheme.parameterName,
			},
		];
	});

	const merged = [...declared, ...fromContainer];

	return merged.filter(
		(security, at) =>
			merged.findIndex(
				(other) => other.kind === security.kind && other.parameterName === security.parameterName,
			) === at,
	);
}

function responsesOf(annotations: Annotation[], rules: AnnotationRules) {
	if (!rules.responses) return [];

	return annotations
		.filter((annotation) => annotation.name.replace(/Attribute$/, "") === rules.responses!.annotation)
		.flatMap((annotation) =>
			annotation.args
				.map((argument) => rules.responses!.statusPattern.exec(argument))
				.filter((match): match is RegExpExecArray => match !== null)
				.map((match) => ({
					status: match[1] ?? match[2],
					description: null,
					mediaTypes: [],
					example: null,
				})),
		)
		.filter((response) => Boolean(response.status));
}

function isContainer(declaration: string, annotations: Annotation[], rules: AnnotationRules) {
	const baseTypes = readBaseTypes(declaration);

	return (
		hasAnnotation(annotations, rules.container.markers) ||
		hasAnnotation(annotations, rules.container.templateAnnotations) ||
		baseTypes.some((baseType) => rules.container.baseTypes.includes(baseType)) ||
		Boolean(
			rules.container.nameSuffix && readClassName(declaration)?.endsWith(rules.container.nameSuffix),
		)
	);
}

/** What a container declaration carries down to every route inside it. */
function containerAt(
	text: string,
	annotations: Annotation[],
	rules: AnnotationRules,
): Container | null {
	if (!isContainer(text, annotations, rules)) return null;

	return {
		name: readClassName(text)!,
		template: templateOf(annotations, rules.container.templateAnnotations),
		security: securityOf(annotations, rules, []),
		anonymous: hasAnnotation(annotations, rules.auth.anonymous),
	};
}

/** Annotations still being collected, and the container they will belong to. */
interface ScanState {
	pending: Annotation[];
	openAnnotationText: string;
	container: Container | null;
}

/**
 * The annotations attached to the declaration on this line, or null when the
 * line is not a declaration: a blank, a comment, an annotation still open across
 * lines, or one held as pending for the declaration below it.
 */
function annotationsAt(
	index: number,
	lines: string[],
	rules: AnnotationRules,
	state: ScanState,
): { text: string; annotations: Annotation[] } | null {
	const line = lines[index].trim();

	if (line.length === 0 || line.startsWith("//")) return null;

	const text = state.openAnnotationText ? `${state.openAnnotationText} ${line}` : line;
	state.openAnnotationText = "";

	if (isAnnotationLine(text, rules.syntax) && bracketBalance(text) > 0) {
		state.openAnnotationText = text;
		return null;
	}

	const annotationsHere = readAnnotations(text, rules.syntax);

	if (isAnnotationLine(text, rules.syntax) && !/[({]\s*$/.test(text) && !readClassName(text)) {
		const declaresMethod = readMethodDeclaration(lines, index);

		if (!declaresMethod || rules.syntax === "bracket") {
			state.pending = [...state.pending, ...annotationsHere];
			return null;
		}
	}

	const annotations = [...state.pending, ...annotationsHere];
	state.pending = [];

	return { text, annotations };
}

interface MethodScan {
	lines: string[];
	index: number;
	framework: FrameworkRules;
	rules: AnnotationRules;
	container: Container;
	method: MethodDeclaration;
	annotations: Annotation[];
	methodAnnotations: Annotation[];
}

/** One method declaration is one route per method annotation sitting above it. */
function routesForMethod(input: MethodScan): FrameworkFileScan {
	const { lines, index, framework, rules, container, method, annotations } = input;
	const routes: FrameworkRouteDraft[] = [];
	const unsupported: FrameworkFileScan["unsupported"] = [];

	for (const methodAnnotation of input.methodAnnotations) {
		const httpMethod = rules.methods[methodAnnotation.name.replace(/Attribute$/, "")];
		const actionTemplate =
			stringValue(methodAnnotation.args[0]) ??
			templateOf(annotations, rules.container.templateAnnotations);
		const combined = combineTemplates(container.template, actionTemplate, framework.path);

		if (combined === null) {
			unsupported.push({
				reason: `${container.name}.${method.name} has no route template, so its path comes from conventional routing.`,
				line: index + 1,
			});
			continue;
		}

		const template = substituteTokens(combined, framework.path, container.name, method.name);
		const pathParameters = templateParameters(template, framework.path);
		const bound = bindSignature(
			method.signature,
			framework,
			new Set(pathParameters.map((parameter) => parameter.name)),
			BODY_METHODS.has(httpMethod),
		);

		routes.push({
			method: httpMethod,
			path: toCanonicalPath(template, framework.path),
			summary: rules.summary
				? readDocSummary(lines, index, rules.summary.linePrefix, rules.summary.tag)
				: null,
			line: index + 1,
			parameters: [...pathParameters, ...bound.parameters],
			headers: bound.headers,
			requestBody: bound.requestBody,
			responses: responsesOf(annotations, rules),
			returnType: rules.responseFromReturnType ? method.returnType : null,
			security: securityOf(annotations, rules, container.security),
			anonymous:
				hasAnnotation(annotations, rules.auth.anonymous) ||
				(container.anonymous && !hasDeclaredScheme(annotations, rules)),
			confidence: "exact",
		});
	}

	return { routes, unsupported };
}

export function readAnnotationRoutes(
	lines: string[],
	framework: FrameworkRules,
): FrameworkFileScan {
	const rules = framework.annotations;
	const routes: FrameworkRouteDraft[] = [];
	const unsupported: FrameworkFileScan["unsupported"] = [];

	if (!rules) return { routes, unsupported };

	const state: ScanState = { pending: [], openAnnotationText: "", container: null };
	// A method declaration spans the lines up to its closing brace; they are read
	// as one and skipped rather than scanned again from the middle.
	let skipUntil = -1;

	for (let index = 0; index < lines.length; index += 1) {
		if (index <= skipUntil) continue;

		const reading = annotationsAt(index, lines, rules, state);

		if (!reading) continue;

		const { text, annotations } = reading;

		if (readClassName(text)) {
			state.container = containerAt(text, annotations, rules);
			continue;
		}

		const methodAnnotations = annotations.filter(
			(annotation) => rules.methods[annotation.name.replace(/Attribute$/, "")],
		);

		if (methodAnnotations.length === 0 || !state.container) continue;

		const method = readMethodDeclaration(lines, index);

		if (!method || method.name === state.container.name) continue;

		const found = routesForMethod({
			lines,
			index,
			framework,
			rules,
			container: state.container,
			method,
			annotations,
			methodAnnotations,
		});

		routes.push(...found.routes);
		unsupported.push(...found.unsupported);
		skipUntil = method.endIndex;
	}

	return { routes, unsupported };
}
